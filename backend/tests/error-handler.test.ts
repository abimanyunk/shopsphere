import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Environment } from '../src/config/env.js';

const environment: Environment = {
  NODE_ENV: 'production',
  HOST: '0.0.0.0',
  PORT: 4000,
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/shopsphere_test',
  REDIS_URL: 'redis://localhost:6379/1',
  SESSION_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  CORS_ORIGIN: 'http://localhost:5173',
  SHUTDOWN_TIMEOUT_MS: 1000,
  DEPENDENCY_TIMEOUT_MS: 50,
  SESSION_TTL_SECONDS: 3600,
  AUTH_RATE_LIMIT_MAX: 100,
  AUTH_RATE_LIMIT_WINDOW_SECONDS: 60,
  CATALOG_CACHE_TTL_SECONDS: 60,
  LOW_STOCK_THRESHOLD: 5,
};

describe('error handling', () => {
  it('returns the consistent production-safe error shape', async () => {
    const app = createApp({
      environment,
      logger: pino({ level: 'silent' }),
      checks: { database: () => Promise.resolve(), redis: () => Promise.resolve() },
    });
    const response = await request(app).get('/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.requestId).toBeTruthy();
    expect(response.body.error).not.toHaveProperty('debug');
  });
});
