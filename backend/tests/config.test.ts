import { describe, expect, it } from 'vitest';
import { loadEnvironment } from '../src/config/env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/shopsphere_test',
  REDIS_URL: 'redis://localhost:6379/1',
  SESSION_SECRET: 'a-test-secret-that-is-at-least-32-characters',
  CORS_ORIGIN: 'http://localhost:5173',
};

describe('environment configuration', () => {
  it('loads valid values and applies safe defaults', () => {
    const environment = loadEnvironment(validEnvironment);
    expect(environment.PORT).toBe(4000);
    expect(environment.HOST).toBe('0.0.0.0');
    expect(environment.NODE_ENV).toBe('test');
  });

  it('fails without required configuration', () => {
    expect(() => loadEnvironment({ NODE_ENV: 'test' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('does not include secret values in validation errors', () => {
    const invalidSecret = 'short-secret';
    expect(() => loadEnvironment({ ...validEnvironment, SESSION_SECRET: invalidSecret })).toThrow(
      /^Invalid environment configuration\. Check: SESSION_SECRET$/,
    );
  });
});
