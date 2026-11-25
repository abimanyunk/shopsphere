import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../modules/auth/auth.constants.js';
import type { SessionService } from '../modules/auth/session.service.js';
import { AppError } from '../utils/app-error.js';

function tokensMatch(left: string, right: string): boolean {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function requireCsrf(sessions: SessionService): RequestHandler {
  return (request, _response, next) => {
    const cookie = request.cookies[CSRF_COOKIE_NAME] as unknown;
    const header = request.header(CSRF_HEADER_NAME);

    if (typeof cookie !== 'string' || !header || !tokensMatch(cookie, header)) {
      next(new AppError(403, 'CSRF_VALIDATION_FAILED', 'CSRF validation failed'));
      return;
    }
    if (request.auth && !sessions.verifyCsrf(request.auth.session, header)) {
      next(new AppError(403, 'CSRF_VALIDATION_FAILED', 'CSRF validation failed'));
      return;
    }
    next();
  };
}
