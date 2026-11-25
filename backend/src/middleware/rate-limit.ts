import { createHmac } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Redis } from 'ioredis';
import { AppError } from '../utils/app-error.js';

export function createAuthRateLimit(
  redis: Redis,
  secret: string,
  maximum: number,
  windowSeconds: number,
): RequestHandler {
  return async (request, response, next) => {
    const identity = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const digest = createHmac('sha256', secret).update(identity).digest('hex');
    const key = `shopsphere:rate:auth:${digest}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);

    response.setHeader('RateLimit-Limit', maximum);
    response.setHeader('RateLimit-Remaining', Math.max(0, maximum - count));
    if (count > maximum) {
      response.setHeader('Retry-After', windowSeconds);
      next(new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many authentication attempts'));
      return;
    }
    next();
  };
}
