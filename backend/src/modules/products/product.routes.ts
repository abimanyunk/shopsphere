import { UserRole, type PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { CatalogueCache } from '../../cache/catalogue-cache.js';
import type { Environment } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authentication.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { SessionService } from '../auth/session.service.js';
import { CategoryController } from '../categories/category.controller.js';
import { CategoryRepository } from '../categories/category.repository.js';
import { CategoryService } from '../categories/category.service.js';
import { UserRepository } from '../users/user.repository.js';
import { ProductController } from './product.controller.js';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';

interface CatalogueRouterDependencies {
  prisma: PrismaClient;
  redis: Redis;
  environment: Environment;
  logger: Logger;
}

export function createCatalogueRouter({
  prisma,
  redis,
  environment,
  logger,
}: CatalogueRouterDependencies): Router {
  const router = Router();
  const admin = Router();
  const cache = new CatalogueCache(redis, logger, environment.CATALOG_CACHE_TTL_SECONDS);
  const categories = new CategoryRepository(prisma);
  const categoryController = new CategoryController(new CategoryService(categories, cache));
  const productController = new ProductController(
    new ProductService(new ProductRepository(prisma), categories, cache),
  );
  const sessions = new SessionService(
    redis,
    environment.SESSION_SECRET,
    environment.SESSION_TTL_SECONDS,
  );
  const authenticated = authenticate(sessions, new UserRepository(prisma));

  router.get('/categories', categoryController.listPublic);
  router.get('/products', productController.listPublic);
  router.get('/products/:productId', productController.detail);

  admin.use(authenticated, requireRole(UserRole.ADMIN));
  admin.get('/categories', categoryController.listAdmin);
  admin.post('/categories', requireCsrf(sessions), categoryController.create);
  admin.patch('/categories/:categoryId', requireCsrf(sessions), categoryController.update);
  admin.get('/products', productController.listAdmin);
  admin.post('/products', requireCsrf(sessions), productController.create);
  admin.patch('/products/:productId', requireCsrf(sessions), productController.update);
  admin.patch(
    '/products/:productId/inventory',
    requireCsrf(sessions),
    productController.updateInventory,
  );
  admin.delete('/products/:productId', requireCsrf(sessions), productController.deactivate);
  router.use('/admin', admin);

  return router;
}
