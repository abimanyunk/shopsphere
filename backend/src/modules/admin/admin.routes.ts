import { UserRole, type PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { CatalogueCache } from '../../cache/catalogue-cache.js';
import type { Environment } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authentication.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { SessionService } from '../auth/session.service.js';
import { OrderService } from '../orders/order.service.js';
import { UserRepository } from '../users/user.repository.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

interface AdminRouterDependencies {
  prisma: PrismaClient;
  redis: Redis;
  environment: Environment;
  logger: Logger;
}

export function createAdminRouter({
  prisma,
  redis,
  environment,
  logger,
}: AdminRouterDependencies): Router {
  const router = Router();
  const sessions = new SessionService(
    redis,
    environment.SESSION_SECRET,
    environment.SESSION_TTL_SECONDS,
  );
  const controller = new AdminController(
    new AdminService(prisma, environment.LOW_STOCK_THRESHOLD),
    new OrderService(
      prisma,
      new CatalogueCache(redis, logger, environment.CATALOG_CACHE_TTL_SECONDS),
    ),
  );

  router.use(authenticate(sessions, new UserRepository(prisma)), requireRole(UserRole.ADMIN));
  router.get('/dashboard', controller.dashboard);
  router.get('/orders', controller.ordersList);
  router.get('/orders/:orderId', controller.orderDetail);
  router.patch('/orders/:orderId/status', requireCsrf(sessions), controller.updateOrderStatus);
  return router;
}
