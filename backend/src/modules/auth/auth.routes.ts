import { UserRole, type PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { Redis } from 'ioredis';
import type { Environment } from '../../config/env.js';
import { authenticate, requireRole } from '../../middleware/authentication.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { createAuthRateLimit } from '../../middleware/rate-limit.js';
import { UserController } from '../users/user.controller.js';
import { UserRepository } from '../users/user.repository.js';
import { UserService } from '../users/user.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';

interface AuthRouterDependencies {
  prisma: PrismaClient;
  redis: Redis;
  environment: Environment;
}

export function createAuthRouter({ prisma, redis, environment }: AuthRouterDependencies): Router {
  const router = Router();
  const users = new UserRepository(prisma);
  const sessions = new SessionService(
    redis,
    environment.SESSION_SECRET,
    environment.SESSION_TTL_SECONDS,
  );
  const authService = new AuthService(users, new PasswordService());
  const userService = new UserService(users);
  const authController = new AuthController(authService, sessions, environment);
  const userController = new UserController(userService);
  const authenticated = authenticate(sessions, users);
  const csrfProtected = requireCsrf(sessions);
  const authRateLimit = createAuthRateLimit(
    redis,
    environment.SESSION_SECRET,
    environment.AUTH_RATE_LIMIT_MAX,
    environment.AUTH_RATE_LIMIT_WINDOW_SECONDS,
  );

  router.get('/auth/csrf', authController.getCsrf);
  router.post('/auth/register', authRateLimit, csrfProtected, authController.register);
  router.post('/auth/login', authRateLimit, csrfProtected, authController.login);
  router.post('/auth/logout', authenticated, csrfProtected, authController.logout);
  router.get('/auth/session', authenticated, authController.session);

  router.get('/users/me', authenticated, userController.profile);
  router.patch('/users/me', authenticated, csrfProtected, userController.updateProfile);

  router.get('/admin/session', authenticated, requireRole(UserRole.ADMIN), authController.session);

  return router;
}
