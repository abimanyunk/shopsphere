import type { CookieOptions, Response } from 'express';
import type { Environment } from '../../config/env.js';
import { CSRF_COOKIE_NAME, SESSION_COOKIE_NAME } from './auth.constants.js';

function sharedCookieOptions(environment: Environment): CookieOptions {
  return {
    secure: environment.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

export function setSessionCookies(
  response: Response,
  environment: Environment,
  sessionToken: string,
  csrfToken: string,
): void {
  const maxAge = environment.SESSION_TTL_SECONDS * 1000;
  response.cookie(SESSION_COOKIE_NAME, sessionToken, {
    ...sharedCookieOptions(environment),
    httpOnly: true,
    maxAge,
  });
  response.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...sharedCookieOptions(environment),
    httpOnly: false,
    maxAge,
  });
}

export function setCsrfCookie(
  response: Response,
  environment: Environment,
  csrfToken: string,
): void {
  response.cookie(CSRF_COOKIE_NAME, csrfToken, {
    ...sharedCookieOptions(environment),
    httpOnly: false,
    maxAge: environment.SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookies(response: Response, environment: Environment): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    ...sharedCookieOptions(environment),
    httpOnly: true,
  });
  response.clearCookie(CSRF_COOKIE_NAME, {
    ...sharedCookieOptions(environment),
    httpOnly: false,
  });
}
