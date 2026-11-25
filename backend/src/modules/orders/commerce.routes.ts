import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { CatalogueCache } from '../../cache/catalogue-cache.js';
import type { Environment } from '../../config/env.js';
import { authenticate } from '../../middleware/authentication.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { SessionService } from '../auth/session.service.js';
import { CartController } from '../cart/cart.controller.js';
import { CartRepository } from '../cart/cart.repository.js';
import { CartService } from '../cart/cart.service.js';
import { UserRepository } from '../users/user.repository.js';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';

interface CommerceRouterDependencies {
  prisma: PrismaClient;
  redis: Redis;
  environment: Environment;
  logger: Logger;
}

export function createCommerceRouter({
  prisma,
  redis,
  environment,
  logger,
}: CommerceRouterDependencies): Router {
  const router = Router();
  const cart = Router();
  const orders = Router();
  const sessions = new SessionService(
    redis,
    environment.SESSION_SECRET,
    environment.SESSION_TTL_SECONDS,
  );
  const authenticated = authenticate(sessions, new UserRepository(prisma));
  const csrfProtected = requireCsrf(sessions);
  const cartController = new CartController(new CartService(new CartRepository(prisma)));
  const orderController = new OrderController(
    new OrderService(
      prisma,
      new CatalogueCache(redis, logger, environment.CATALOG_CACHE_TTL_SECONDS),
    ),
  );

  cart.use(authenticated);
  cart.get('/', cartController.get);
  cart.post('/items', csrfProtected, cartController.add);
  cart.patch('/items/:itemId', csrfProtected, cartController.update);
  cart.delete('/items/:itemId', csrfProtected, cartController.remove);

  orders.use(authenticated);
  orders.post('/checkout', csrfProtected, orderController.checkout);
  orders.get('/', orderController.list);
  orders.get('/:orderId', orderController.detail);
  orders.post('/:orderId/cancel', csrfProtected, orderController.cancel);

  router.use('/cart', cart);
  router.use('/orders', orders);

  return router;
}
