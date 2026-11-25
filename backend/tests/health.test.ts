import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Environment } from '../src/config/env.js';

const environment: Environment = {
  NODE_ENV: 'test',
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

function appWithChecks(database: () => Promise<unknown>, redis: () => Promise<unknown>) {
  return createApp({ environment, logger: pino({ level: 'silent' }), checks: { database, redis } });
}

describe('health endpoints', () => {
  it('reports liveness without checking dependencies', async () => {
    const response = await request(
      appWithChecks(
        () => Promise.reject(new Error('offline')),
        () => Promise.reject(new Error('offline')),
      ),
    ).get('/health/live');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('alive');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('reports ready when dependencies respond', async () => {
    const response = await request(
      appWithChecks(
        () => Promise.resolve(),
        () => Promise.resolve(),
      ),
    ).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      status: 'ready',
      checks: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });

  it('reports unavailable dependencies without exposing error details', async () => {
    const response = await request(
      appWithChecks(
        () => Promise.reject(new Error('postgresql://secret@internal-host')),
        () => new Promise(() => undefined),
      ),
    ).get('/health/ready');
    expect(response.status).toBe(503);
    expect(response.body.data.status).toBe('not_ready');
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});
