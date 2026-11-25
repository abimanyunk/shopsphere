import type { Request, Response } from 'express';
import type { Environment } from '../../config/env.js';
import { parseInput } from '../../utils/validation.js';
import { SESSION_COOKIE_NAME } from './auth.constants.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import { clearSessionCookies, setCsrfCookie, setSessionCookies } from './cookies.js';
import type { SessionService } from './session.service.js';

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly environment: Environment,
  ) {}

  getCsrf = async (request: Request, response: Response): Promise<void> => {
    const sessionToken = request.cookies[SESSION_COOKIE_NAME] as unknown;
    const rotated =
      typeof sessionToken === 'string' ? await this.sessions.rotateCsrf(sessionToken) : null;
    const csrfToken = rotated ?? this.sessions.createCsrfToken();
    setCsrfCookie(response, this.environment, csrfToken);
    response.json({ data: { csrfToken } });
  };

  register = async (request: Request, response: Response): Promise<void> => {
    const user = await this.auth.register(parseInput(registerSchema, request.body));
    await this.replaceSession(request, response, user.id);
    const csrfToken = response.locals.csrfToken as string;
    response.status(201).json({ data: { user, csrfToken } });
  };

  login = async (request: Request, response: Response): Promise<void> => {
    const user = await this.auth.login(parseInput(loginSchema, request.body));
    await this.replaceSession(request, response, user.id);
    const csrfToken = response.locals.csrfToken as string;
    response.json({ data: { user, csrfToken } });
  };

  logout = async (request: Request, response: Response): Promise<void> => {
    if (request.auth) await this.sessions.delete(request.auth.sessionToken);
    clearSessionCookies(response, this.environment);
    response.json({ data: { success: true } });
  };

  session = (request: Request, response: Response): void => {
    response.json({ data: { user: request.auth?.user } });
  };

  private async replaceSession(
    request: Request,
    response: Response,
    userId: string,
  ): Promise<void> {
    const existingToken = request.cookies[SESSION_COOKIE_NAME] as unknown;
    if (typeof existingToken === 'string') await this.sessions.delete(existingToken);
    const created = await this.sessions.create(userId);
    setSessionCookies(response, this.environment, created.sessionToken, created.csrfToken);
    response.locals.csrfToken = created.csrfToken;
  }
}
