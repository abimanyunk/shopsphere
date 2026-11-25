import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Environment } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${request.method} ${request.path} was not found`));
};

export function createErrorHandler(environment: Environment): ErrorRequestHandler {
  return (error: unknown, request, response, _next) => {
    const knownError = error instanceof AppError;
    const statusCode = knownError ? error.statusCode : 500;

    if (!knownError) {
      request.log.error({ err: error }, 'Unhandled request error');
    }

    response.status(statusCode).json({
      error: {
        code: knownError ? error.code : 'INTERNAL_SERVER_ERROR',
        message: knownError ? error.message : 'An unexpected error occurred',
        ...(knownError && error.details !== undefined ? { details: error.details } : {}),
        requestId: request.id,
        ...(environment.NODE_ENV !== 'production' && error instanceof Error
          ? { debug: error.message }
          : {}),
      },
    });
  };
}
