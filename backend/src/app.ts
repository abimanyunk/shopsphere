import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import swaggerUi from 'swagger-ui-express';
import type { Environment } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { DependencyChecks } from './modules/health/health.service.js';

interface ApplicationDependencies {
  environment: Environment;
  logger: Logger;
  checks: DependencyChecks;
  apiRouter?: Router;
}

export function createApp({
  environment,
  logger,
  checks,
  apiRouter,
}: ApplicationDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestLogger(logger));
  app.use(
    '/docs',
    helmet({ contentSecurityPolicy: false }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument),
  );
  app.use(helmet());
  app.use(cors({ origin: environment.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/health', createHealthRouter(checks, environment.DEPENDENCY_TIMEOUT_MS));
  app.get('/openapi.json', (_request, response) => response.json(openApiDocument));
  if (apiRouter) app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(createErrorHandler(environment));

  return app;
}
