import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.constants.js';
import type { SessionService } from '../modules/auth/session.service.js';
import type { UserRepository } from '../modules/users/user.repository.js';
import { toPublicUser } from '../modules/users/user.types.js';
import { AppError } from '../utils/app-error.js';

export function authenticate(sessions: SessionService, users: UserRepository): RequestHandler {
  return async (request, _response, next) => {
    const token = request.cookies[SESSION_COOKIE_NAME] as unknown;
    if (typeof token !== 'string' || token.length === 0) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
      return;
    }

    const session = await sessions.get(token);
    if (!session) {
      next(new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired'));
      return;
    }

    const user = await users.findById(session.userId);
    if (!user || !user.isActive) {
      await sessions.delete(token);
      next(new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired'));
      return;
    }

    request.auth = { user: toPublicUser(user), sessionToken: token, session };
    next();
  };
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
      return;
    }
    if (!roles.includes(request.auth.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }
    next();
  };
}
