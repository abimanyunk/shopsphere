import { createServer } from 'node:http';
import { config } from 'dotenv';
import { createRedisClient } from './cache/redis.js';
import { createApp } from './app.js';
import { loadEnvironment } from './config/env.js';
import { createPrismaClient } from './database/prisma.js';
import { createLogger } from './logger/logger.js';
import { createApiRouter } from './routes/api.routes.js';

config({ path: new URL('../../.env', import.meta.url) });

const environment = loadEnvironment();
const logger = createLogger(environment);
const redis = createRedisClient(environment.REDIS_URL);
redis.on('error', (error) => logger.error({ err: error }, 'Redis connection error'));
const prisma = createPrismaClient(environment.DATABASE_URL);

try {
  await redis.connect();
} catch (error) {
  logger.warn({ err: error }, 'Redis was unavailable during startup; readiness will remain false');
}

const app = createApp({
  environment,
  logger,
  apiRouter: createApiRouter({ prisma, redis, environment, logger }),
  checks: {
    database: () => prisma.$queryRaw`SELECT 1`,
    redis: async () => {
      if (redis.status === 'wait') await redis.connect();
      await redis.ping();
    },
  },
});

const server = createServer(app);
let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, environment.SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(async (error) => {
    if (error) logger.error({ err: error }, 'HTTP server close failed');
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    clearTimeout(forceExit);
    logger.info('Graceful shutdown completed');
    process.exit(error ? 1 : 0);
  });
}

server.listen(environment.PORT, environment.HOST, () => {
  logger.info({ host: environment.HOST, port: environment.PORT }, 'ShopSphere backend started');
});

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled rejection');
  void shutdown('SIGTERM');
});
