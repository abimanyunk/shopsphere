import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import type { Environment } from '../config/env.js';
import { createAuthRouter } from '../modules/auth/auth.routes.js';
import { createAdminRouter } from '../modules/admin/admin.routes.js';
import { createCatalogueRouter } from '../modules/products/product.routes.js';
import { createCommerceRouter } from '../modules/orders/commerce.routes.js';

interface ApiRouterDependencies {
  prisma: PrismaClient;
  redis: Redis;
  environment: Environment;
  logger: Logger;
}

export function createApiRouter(dependencies: ApiRouterDependencies): Router {
  const router = Router();
  router.use(createAuthRouter(dependencies));
  router.use(createCatalogueRouter(dependencies));
  router.use(createCommerceRouter(dependencies));
  router.use('/admin', createAdminRouter(dependencies));
  return router;
}
