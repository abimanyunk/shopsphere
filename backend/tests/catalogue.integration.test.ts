import pino from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createRedisClient } from '../src/cache/redis.js';
import type { Environment } from '../src/config/env.js';
import { createPrismaClient } from '../src/database/prisma.js';
import { PasswordService } from '../src/modules/auth/password.service.js';
import { createApiRouter } from '../src/routes/api.routes.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const redisUrl = process.env.TEST_REDIS_URL;

if (!databaseUrl || !redisUrl) {
  throw new Error('TEST_DATABASE_URL and TEST_REDIS_URL are required for catalogue tests');
}
if (!new URL(databaseUrl).pathname.slice(1).endsWith('_test')) {
  throw new Error('Catalogue tests refuse to use a database without an _test suffix');
}

const environment: Environment = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 4000,
  LOG_LEVEL: 'silent',
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  SESSION_SECRET: 'catalogue-test-secret-that-is-at-least-32-characters',
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
const logger = pino({ level: 'silent' });
const app = createApp({
  environment,
  logger,
  checks: { database: () => prisma.$queryRaw`SELECT 1`, redis: () => redis.ping() },
  apiRouter: createApiRouter({ prisma, redis, environment, logger }),
});

let electronicsId: string;
let booksId: string;
let laptopId: string;

async function clean(): Promise<void> {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
}

async function seedCatalogue(): Promise<void> {
  const electronics = await prisma.category.create({
    data: { name: 'Electronics', slug: 'electronics', description: 'Devices' },
  });
  const books = await prisma.category.create({
    data: { name: 'Books', slug: 'books', description: 'Reading' },
  });
  electronicsId = electronics.id;
  booksId = books.id;
  const laptop = await prisma.product.create({
    data: {
      name: 'Alpha Laptop',
      description: 'Portable development laptop',
      sku: 'LAPTOP-001',
      price: '999.99',
      stockQuantity: 5,
      categoryId: electronics.id,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
  });
  laptopId = laptop.id;
  await prisma.product.createMany({
    data: [
      {
        name: 'Budget Mouse',
        description: 'Simple wired mouse',
        sku: 'MOUSE-001',
        price: '25.00',
        stockQuantity: 0,
        categoryId: electronics.id,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
      {
        name: 'Practical DevOps Book',
        description: 'Delivery and operations handbook',
        sku: 'BOOK-001',
        price: '49.50',
        stockQuantity: 10,
        categoryId: books.id,
        createdAt: new Date('2026-03-01T00:00:00Z'),
      },
    ],
  });
}

async function adminAgent() {
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
  const agent = request.agent(app);
  const csrf = await agent.get('/api/v1/auth/csrf');
  const login = await agent
    .post('/api/v1/auth/login')
    .set('x-csrf-token', csrf.body.data.csrfToken)
    .send({ email: 'admin@example.test', password });
  expect(login.status).toBe(200);
  return { agent, csrfToken: login.body.data.csrfToken as string };
}

beforeAll(async () => {
  await redis.connect();
});

beforeEach(async () => {
  await clean();
  await seedCatalogue();
});

afterAll(async () => {
  await clean();
  await Promise.all([prisma.$disconnect(), redis.quit()]);
});

describe('public catalogue', () => {
  it('lists active categories and product details', async () => {
    const categories = await request(app).get('/api/v1/categories');
    expect(categories.status).toBe(200);
    expect(
      categories.body.data.categories.map((category: { slug: string }) => category.slug),
    ).toEqual(['books', 'electronics']);

    const detail = await request(app).get(`/api/v1/products/${laptopId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.product).toMatchObject({
      sku: 'LAPTOP-001',
      price: '999.99',
      availability: 'IN_STOCK',
      category: { slug: 'electronics' },
    });
  });

  it('supports pagination, search, filters, availability, and sorting', async () => {
    const page = await request(app).get('/api/v1/products?limit=2&page=1&sort=price_asc');
    expect(page.status).toBe(200);
    expect(page.body.data.products.map((product: { sku: string }) => product.sku)).toEqual([
      'MOUSE-001',
      'BOOK-001',
    ]);
    expect(page.body.meta).toEqual({ page: 1, limit: 2, totalItems: 3, totalPages: 2 });

    const search = await request(app).get('/api/v1/products?search=devops&inStock=true');
    expect(search.body.data.products).toHaveLength(1);
    expect(search.body.data.products[0].sku).toBe('BOOK-001');

    const filtered = await request(app).get(
      '/api/v1/products?category=electronics&minPrice=100&maxPrice=1000',
    );
    expect(filtered.body.data.products.map((product: { sku: string }) => product.sku)).toEqual([
      'LAPTOP-001',
    ]);

    const outOfStock = await request(app).get('/api/v1/products?inStock=false');
    expect(outOfStock.body.data.products[0].availability).toBe('OUT_OF_STOCK');
  });

  it('hides inactive catalogue records and validates query ranges', async () => {
    await prisma.product.update({ where: { id: laptopId }, data: { isActive: false } });
    await redis.flushdb();
    expect((await request(app).get(`/api/v1/products/${laptopId}`)).status).toBe(404);

    await prisma.category.update({ where: { id: booksId }, data: { isActive: false } });
    await redis.flushdb();
    const list = await request(app).get('/api/v1/products');
    expect(list.body.data.products.map((product: { sku: string }) => product.sku)).not.toContain(
      'BOOK-001',
    );
    const filteredInactive = await request(app).get('/api/v1/products?category=books');
    expect(filteredInactive.body.data.products).toHaveLength(0);

    const invalid = await request(app).get('/api/v1/products?minPrice=100&maxPrice=10');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('admin catalogue management', () => {
  it('protects admin endpoints from customers', async () => {
    const password = 'CustomerPassword1!';
    await prisma.user.create({
      data: {
        email: 'customer@example.test',
        passwordHash: await new PasswordService().hash(password),
        firstName: 'Customer',
        lastName: 'User',
      },
    });
    const agent = request.agent(app);
    const csrf = await agent.get('/api/v1/auth/csrf');
    await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrf.body.data.csrfToken)
      .send({ email: 'customer@example.test', password });
    expect((await agent.get('/api/v1/admin/products')).status).toBe(403);
  });

  it('creates, updates, inventories, caches, and deactivates products', async () => {
    const { agent, csrfToken } = await adminAgent();
    const create = await agent.post('/api/v1/admin/products').set('x-csrf-token', csrfToken).send({
      name: 'USB-C Dock',
      description: 'Multi-port desktop dock',
      sku: 'dock-001',
      price: '149.90',
      stockQuantity: 7,
      categoryId: electronicsId,
    });
    expect(create.status).toBe(201);
    expect(create.body.data.product.sku).toBe('DOCK-001');
    const productId = create.body.data.product.id as string;

    const duplicate = await agent
      .post('/api/v1/admin/products')
      .set('x-csrf-token', csrfToken)
      .send({
        name: 'Duplicate Dock',
        description: 'Duplicate SKU',
        sku: 'DOCK-001',
        price: '100.00',
        stockQuantity: 1,
        categoryId: electronicsId,
      });
    expect(duplicate.status).toBe(409);

    await request(app).get(`/api/v1/products/${productId}`);
    const versionBefore = Number((await redis.get('shopsphere:catalogue:version')) ?? 1);
    const inventory = await agent
      .patch(`/api/v1/admin/products/${productId}/inventory`)
      .set('x-csrf-token', csrfToken)
      .send({ stockQuantity: 0 });
    expect(inventory.status).toBe(200);
    expect(inventory.body.data.product.availability).toBe('OUT_OF_STOCK');
    expect(Number(await redis.get('shopsphere:catalogue:version'))).toBeGreaterThan(versionBefore);
    const refreshed = await request(app).get(`/api/v1/products/${productId}`);
    expect(refreshed.body.data.product.stockQuantity).toBe(0);

    const updated = await agent
      .patch(`/api/v1/admin/products/${productId}`)
      .set('x-csrf-token', csrfToken)
      .send({ price: '139.90', categoryId: booksId });
    expect(updated.body.data.product).toMatchObject({
      price: '139.90',
      category: { slug: 'books' },
    });

    const deactivated = await agent
      .delete(`/api/v1/admin/products/${productId}`)
      .set('x-csrf-token', csrfToken);
    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.product.isActive).toBe(false);
    expect((await request(app).get(`/api/v1/products/${productId}`)).status).toBe(404);
    const adminList = await agent.get('/api/v1/admin/products?search=DOCK-001');
    expect(adminList.body.data.products[0].isActive).toBe(false);
  });

  it('manages categories and invalidates public category caching', async () => {
    const { agent, csrfToken } = await adminAgent();
    await request(app).get('/api/v1/categories');
    const created = await agent
      .post('/api/v1/admin/categories')
      .set('x-csrf-token', csrfToken)
      .send({ name: 'Sports', slug: 'sports', description: 'Sports equipment' });
    expect(created.status).toBe(201);
    const categoryId = created.body.data.category.id as string;
    const publicAfterCreate = await request(app).get('/api/v1/categories');
    expect(
      publicAfterCreate.body.data.categories.map((category: { slug: string }) => category.slug),
    ).toContain('sports');

    const deactivated = await agent
      .patch(`/api/v1/admin/categories/${categoryId}`)
      .set('x-csrf-token', csrfToken)
      .send({ isActive: false });
    expect(deactivated.status).toBe(200);
    const publicAfterDeactivate = await request(app).get('/api/v1/categories');
    expect(
      publicAfterDeactivate.body.data.categories.map((category: { slug: string }) => category.slug),
    ).not.toContain('sports');
  });
});
