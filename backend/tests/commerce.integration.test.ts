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
  throw new Error('TEST_DATABASE_URL and TEST_REDIS_URL are required for commerce tests');
}
if (!new URL(databaseUrl).pathname.slice(1).endsWith('_test')) {
  throw new Error('Commerce tests refuse to use a database without an _test suffix');
}

const environment: Environment = {
  NODE_ENV: 'test',
  HOST: '127.0.0.1',
  PORT: 4000,
  LOG_LEVEL: 'silent',
  DATABASE_URL: databaseUrl,
  REDIS_URL: redisUrl,
  SESSION_SECRET: 'commerce-test-secret-that-is-at-least-32-characters',
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

let productId: string;

const shipping = {
  name: 'Test Customer',
  addressLine1: '42 Platform Street',
  addressLine2: null,
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'in',
};

async function clean(): Promise<void> {
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushdb();
}

async function seedProduct(stockQuantity = 5): Promise<void> {
  const category = await prisma.category.create({
    data: { name: 'Electronics', slug: 'electronics' },
  });
  const product = await prisma.product.create({
    data: {
      name: 'Transaction-Test Product',
      description: 'Product used for cart and checkout tests',
      sku: 'TXN-001',
      price: '100.00',
      stockQuantity,
      categoryId: category.id,
    },
  });
  productId = product.id;
}

async function customerAgent(sequence = 1) {
  const agent = request.agent(app);
  const csrf = await agent.get('/api/v1/auth/csrf');
  const registered = await agent
    .post('/api/v1/auth/register')
    .set('x-csrf-token', csrf.body.data.csrfToken)
    .send({
      email: `customer-${sequence}@example.test`,
      password: 'CustomerPassword1!',
      firstName: 'Test',
      lastName: `Customer ${sequence}`,
    });
  expect(registered.status).toBe(201);
  return { agent, csrfToken: registered.body.data.csrfToken as string };
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

async function addToCart(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  quantity: number,
) {
  return agent
    .post('/api/v1/cart/items')
    .set('x-csrf-token', csrfToken)
    .send({ productId, quantity });
}

async function checkout(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  outcome: 'SUCCEEDED' | 'FAILED' = 'SUCCEEDED',
) {
  return agent
    .post('/api/v1/orders/checkout')
    .set('x-csrf-token', csrfToken)
    .send({ shipping, payment: { method: 'SIMULATED', outcome } });
}

beforeAll(async () => {
  await redis.connect();
});

beforeEach(async () => {
  await clean();
  await seedProduct();
});

afterAll(async () => {
  await clean();
  await Promise.all([prisma.$disconnect(), redis.quit()]);
});

describe('shopping cart', () => {
  it('requires authentication and starts with an empty cart', async () => {
    expect((await request(app).get('/api/v1/cart')).status).toBe(401);
    const { agent } = await customerAgent();
    const response = await agent.get('/api/v1/cart');
    expect(response.status).toBe(200);
    expect(response.body.data.cart).toEqual({
      id: null,
      items: [],
      subtotal: '0.00',
      total: '0.00',
    });
  });

  it('adds, combines, updates, and removes cart items with calculated totals', async () => {
    const { agent, csrfToken } = await customerAgent();
    const added = await addToCart(agent, csrfToken, 2);
    expect(added.status).toBe(201);
    expect(added.body.data.cart).toMatchObject({ subtotal: '200.00', total: '200.00' });
    expect(added.body.data.cart.items[0]).toMatchObject({
      quantity: 2,
      unitPrice: '100.00',
      lineTotal: '200.00',
    });

    const combined = await addToCart(agent, csrfToken, 1);
    expect(combined.body.data.cart.items[0].quantity).toBe(3);
    const itemId = combined.body.data.cart.items[0].id as string;

    const updated = await agent
      .patch(`/api/v1/cart/items/${itemId}`)
      .set('x-csrf-token', csrfToken)
      .send({ quantity: 4 });
    expect(updated.body.data.cart.subtotal).toBe('400.00');

    const removed = await agent
      .delete(`/api/v1/cart/items/${itemId}`)
      .set('x-csrf-token', csrfToken);
    expect(removed.status).toBe(200);
    expect(removed.body.data.cart.items).toHaveLength(0);
  });

  it('rejects unavailable stock and prevents access to another customer cart item', async () => {
    const first = await customerAgent(1);
    expect((await addToCart(first.agent, first.csrfToken, 6)).status).toBe(409);
    const added = await addToCart(first.agent, first.csrfToken, 1);
    const itemId = added.body.data.cart.items[0].id as string;

    const second = await customerAgent(2);
    const foreignUpdate = await second.agent
      .patch(`/api/v1/cart/items/${itemId}`)
      .set('x-csrf-token', second.csrfToken)
      .send({ quantity: 1 });
    expect(foreignUpdate.status).toBe(404);

    await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    expect((await addToCart(second.agent, second.csrfToken, 1)).status).toBe(409);
  });
});

describe('checkout and orders', () => {
  it('creates a confirmed order, snapshots prices, reduces inventory, and clears the cart', async () => {
    const { agent, csrfToken } = await customerAgent();
    await addToCart(agent, csrfToken, 2);
    await request(app).get(`/api/v1/products/${productId}`);

    const response = await checkout(agent, csrfToken);
    expect(response.status).toBe(201);
    expect(response.body.data.order).toMatchObject({
      status: 'CONFIRMED',
      subtotal: '200.00',
      total: '200.00',
      shipping: { country: 'IN' },
      payment: { method: 'SIMULATED', status: 'SUCCEEDED', amount: '200.00' },
    });
    expect(response.body.data.order.items[0]).toMatchObject({
      productName: 'Transaction-Test Product',
      sku: 'TXN-001',
      unitPrice: '100.00',
      quantity: 2,
      lineTotal: '200.00',
    });
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity,
    ).toBe(3);
    expect((await agent.get('/api/v1/cart')).body.data.cart.items).toHaveLength(0);
    expect(
      (await request(app).get(`/api/v1/products/${productId}`)).body.data.product.stockQuantity,
    ).toBe(3);

    const history = await agent.get('/api/v1/orders?page=1&limit=10');
    expect(history.status).toBe(200);
    expect(history.body.meta).toEqual({ page: 1, limit: 10, totalItems: 1, totalPages: 1 });
    const detail = await agent.get(`/api/v1/orders/${response.body.data.order.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.order.orderNumber).toBe(response.body.data.order.orderNumber);
  });

  it('records a failed simulated payment without changing stock or clearing the cart', async () => {
    const { agent, csrfToken } = await customerAgent();
    await addToCart(agent, csrfToken, 2);
    const response = await checkout(agent, csrfToken, 'FAILED');
    expect(response.status).toBe(402);
    expect(response.body.error.code).toBe('SIMULATED_PAYMENT_FAILED');
    expect(response.body.error.details.orderId).toBeTruthy();
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity,
    ).toBe(5);
    expect((await agent.get('/api/v1/cart')).body.data.cart.items[0].quantity).toBe(2);
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: response.body.error.details.orderId },
      include: { payment: true },
    });
    expect(order.status).toBe('CANCELLED');
    expect(order.payment?.status).toBe('FAILED');
  });

  it('revalidates changed inventory and creates no partial order when stock becomes insufficient', async () => {
    const { agent, csrfToken } = await customerAgent();
    await addToCart(agent, csrfToken, 2);
    await prisma.product.update({ where: { id: productId }, data: { stockQuantity: 1 } });

    const response = await checkout(agent, csrfToken);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await prisma.order.count()).toBe(0);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity,
    ).toBe(1);
    expect((await agent.get('/api/v1/cart')).body.data.cart.items[0].quantity).toBe(2);
  });

  it('cancels an eligible order once, restores stock, and marks payment refunded', async () => {
    const { agent, csrfToken } = await customerAgent();
    await addToCart(agent, csrfToken, 2);
    const placed = await checkout(agent, csrfToken);
    const orderId = placed.body.data.order.id as string;

    const cancelled = await agent
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('x-csrf-token', csrfToken);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order).toMatchObject({
      status: 'CANCELLED',
      payment: { status: 'REFUNDED' },
    });
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity,
    ).toBe(5);

    const secondCancellation = await agent
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('x-csrf-token', csrfToken);
    expect(secondCancellation.status).toBe(409);
  });

  it('prevents overselling during concurrent checkout', async () => {
    await prisma.product.update({ where: { id: productId }, data: { stockQuantity: 1 } });
    const first = await customerAgent(1);
    const second = await customerAgent(2);
    await addToCart(first.agent, first.csrfToken, 1);
    await addToCart(second.agent, second.csrfToken, 1);

    const responses = await Promise.all([
      checkout(first.agent, first.csrfToken),
      checkout(second.agent, second.csrfToken),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity,
    ).toBe(0);
    expect(await prisma.order.count({ where: { status: 'CONFIRMED' } })).toBe(1);
  });

  it('does not expose one customer order to another customer', async () => {
    const first = await customerAgent(1);
    await addToCart(first.agent, first.csrfToken, 1);
    const placed = await checkout(first.agent, first.csrfToken);
    const second = await customerAgent(2);
    expect((await second.agent.get(`/api/v1/orders/${placed.body.data.order.id}`)).status).toBe(
      404,
    );
  });
});

describe('admin order operations', () => {
  it('reports dashboard metrics and supports filtered global order access', async () => {
    const customer = await customerAgent();
    await addToCart(customer.agent, customer.csrfToken, 2);
    const placed = await checkout(customer.agent, customer.csrfToken);
    const admin = await adminAgent();

    const dashboard = await admin.agent.get('/api/v1/admin/dashboard');
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.metrics).toEqual({
      customers: 1,
      activeProducts: 1,
      lowStockProducts: 1,
      orders: 1,
      pendingOrders: 1,
      confirmedRevenue: '200',
    });

    const list = await admin.agent.get(
      `/api/v1/admin/orders?status=CONFIRMED&search=${placed.body.data.order.orderNumber}`,
    );
    expect(list.status).toBe(200);
    expect(list.body.data.orders).toHaveLength(1);
    const detail = await admin.agent.get(`/api/v1/admin/orders/${placed.body.data.order.id}`);
    expect(detail.status).toBe(200);
  });

  it('enforces order status transitions and allows admin cancellation', async () => {
    const customer = await customerAgent();
    await addToCart(customer.agent, customer.csrfToken, 1);
    const placed = await checkout(customer.agent, customer.csrfToken);
    const orderId = placed.body.data.order.id as string;
    const admin = await adminAgent();

    const invalid = await admin.agent
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('x-csrf-token', admin.csrfToken)
      .send({ status: 'DELIVERED' });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_ORDER_STATUS_TRANSITION');

    const processing = await admin.agent
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('x-csrf-token', admin.csrfToken)
      .send({ status: 'PROCESSING' });
    expect(processing.status).toBe(200);
    expect(processing.body.data.order.status).toBe('PROCESSING');

    const shipped = await admin.agent
      .patch(`/api/v1/admin/orders/${orderId}/status`)
      .set('x-csrf-token', admin.csrfToken)
      .send({ status: 'SHIPPED' });
    expect(shipped.body.data.order.status).toBe('SHIPPED');
  });

  it('restores inventory when an admin cancels a confirmed order', async () => {
    const customer = await customerAgent();
    await addToCart(customer.agent, customer.csrfToken, 2);
    const placed = await checkout(customer.agent, customer.csrfToken);
    const admin = await adminAgent();
    const cancelled = await admin.agent
      .patch(`/api/v1/admin/orders/${placed.body.data.order.id}/status`)
      .set('x-csrf-token', admin.csrfToken)
      .send({ status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order).toMatchObject({
      status: 'CANCELLED',
      payment: { status: 'REFUNDED' },
    });
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity,
    ).toBe(5);
  });
});
