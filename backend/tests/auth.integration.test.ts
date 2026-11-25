import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createRedisClient } from '../src/cache/redis.js';
import type { Environment } from '../src/config/env.js';
import { createPrismaClient } from '../src/database/prisma.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { PasswordService } from '../src/modules/auth/password.service.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;

if (!databaseUrl || !redisUrl) {
  throw new Error('TEST_DATABASE_URL and TEST_REDIS_URL are required for authentication tests');
}

const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error('Authentication tests refuse to use a database without an _test suffix');
}

const environment: Environment = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 4000,
  LOG_LEVEL: 'silent',
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  SESSION_SECRET: 'integration-test-secret-that-is-at-least-32-characters',
  CORS_ORIGIN: 'http://localhost:5173',
  SHUTDOWN_TIMEOUT_MS: 1000,
  DEPENDENCY_TIMEOUT_MS: 100,
  SESSION_TTL_SECONDS: 3600,
  AUTH_RATE_LIMIT_MAX: 1000,
  AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
  CATALOG_CACHE_TTL_SECONDS: 60,
  LOW_STOCK_THRESHOLD: 5,
};

const prisma = createPrismaClient(databaseUrl);
const redis = createRedisClient(redisUrl);
redis.on('error', () => undefined);
const app = createApp({
  environment,
  logger: pino({ level: 'silent' }),
  checks: {
    database: () => prisma.$queryRaw`SELECT 1`,
    redis: () => redis.ping(),
  },
  apiRouter: createAuthRouter({ prisma, redis, environment }),
});

const customer = {
  email: 'Customer@Example.test',
  password: 'CorrectHorseBattery1!',
  firstName: 'Shop',
  lastName: 'Customer',
  phone: '+91 98765 43210',
};

async function csrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const response = await agent.get('/api/v1/auth/csrf');
  expect(response.status).toBe(200);
  return response.body.data.csrfToken as string;
}

async function register(agent: ReturnType<typeof request.agent>) {
  const token = await csrf(agent);
  return agent.post('/api/v1/auth/register').set('x-csrf-token', token).send(customer);
}

beforeAll(async () => {
  await redis.connect();
});

beforeEach(async () => {
  await prisma.user.deleteMany();
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await redis.flushdb();
  await Promise.all([prisma.$disconnect(), redis.quit()]);
});

describe('customer authentication', () => {
  it('rejects state-changing authentication requests without a CSRF token', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(customer);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_VALIDATION_FAILED');
  });

  it('registers a customer with a hashed password and secure session cookies', async () => {
    const agent = request.agent(app);
    const response = await register(agent);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      email: 'customer@example.test',
      firstName: customer.firstName,
      role: 'CUSTOMER',
    });
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(response.body.data.csrfToken).toBeTruthy();
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(
      cookies.some(
        (cookie) => cookie.startsWith('shopsphere_session=') && cookie.includes('HttpOnly'),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (cookie) => cookie.startsWith('shopsphere_csrf=') && !cookie.includes('HttpOnly'),
      ),
    ).toBe(true);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'customer@example.test' },
    });
    expect(stored.passwordHash).not.toBe(customer.password);
    expect(await new PasswordService().verify(stored.passwordHash, customer.password)).toBe(true);
  });

  it('rejects duplicate registration and invalid request data consistently', async () => {
    await register(request.agent(app));
    const duplicateAgent = request.agent(app);
    const duplicate = await register(duplicateAgent);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_ALREADY_EXISTS');

    const invalidAgent = request.agent(app);
    const token = await csrf(invalidAgent);
    const invalid = await invalidAgent
      .post('/api/v1/auth/register')
      .set('x-csrf-token', token)
      .send({ ...customer, password: 'short', unexpected: true });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(invalid.body)).not.toContain(customer.password);
  });

  it('logs in with valid credentials and returns a generic error for invalid credentials', async () => {
    await register(request.agent(app));
    const agent = request.agent(app);
    let token = await csrf(agent);
    const invalid = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', token)
      .send({ email: customer.email, password: 'DefinitelyWrong1!' });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    });

    token = await csrf(agent);
    const valid = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', token)
      .send({ email: customer.email, password: customer.password });
    expect(valid.status).toBe(200);
    expect(valid.body.data.user.email).toBe('customer@example.test');

    const session = await agent.get('/api/v1/auth/session');
    expect(session.status).toBe(200);
    expect(session.body.data.user.role).toBe('CUSTOMER');
  });

  it('requires authentication and invalidates the session during logout', async () => {
    const anonymous = await request(app).get('/api/v1/users/me');
    expect(anonymous.status).toBe(401);

    const agent = request.agent(app);
    const registered = await register(agent);
    const logout = await agent
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', registered.body.data.csrfToken);
    expect(logout.status).toBe(200);

    const expired = await agent.get('/api/v1/auth/session');
    expect(expired.status).toBe(401);
  });
});

describe('profile and authorization', () => {
  it('reads and updates the authenticated profile with CSRF protection', async () => {
    const agent = request.agent(app);
    const registered = await register(agent);

    const rejected = await agent.patch('/api/v1/users/me').send({ firstName: 'Updated' });
    expect(rejected.status).toBe(403);

    const updated = await agent
      .patch('/api/v1/users/me')
      .set('x-csrf-token', registered.body.data.csrfToken)
      .send({ firstName: 'Updated', phone: null });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user).toMatchObject({ firstName: 'Updated', phone: null });

    const profile = await agent.get('/api/v1/users/me');
    expect(profile.status).toBe(200);
    expect(profile.body.data.user.firstName).toBe('Updated');
  });

  it('forbids customers from admin routes and permits administrators', async () => {
    const customerAgent = request.agent(app);
    await register(customerAgent);
    expect((await customerAgent.get('/api/v1/admin/session')).status).toBe(403);

    const password = 'AdministratorPassword1!';
    await prisma.user.create({
      data: {
        email: 'admin@example.test',
        passwordHash: await new PasswordService().hash(password),
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    const adminAgent = request.agent(app);
    const token = await csrf(adminAgent);
    const login = await adminAgent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', token)
      .send({ email: 'admin@example.test', password });
    expect(login.status).toBe(200);

    const adminSession = await adminAgent.get('/api/v1/admin/session');
    expect(adminSession.status).toBe(200);
    expect(adminSession.body.data.user.role).toBe('ADMIN');
  });
});
