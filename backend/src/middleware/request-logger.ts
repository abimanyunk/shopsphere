import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

export function requestLogger(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(request, response) {
      const incoming = request.headers['x-request-id'];
      const requestId =
        typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
      response.setHeader('x-request-id', requestId);
      return requestId;
    },
    customProps: (request) => ({ requestId: request.id }),
    customSuccessMessage: (request, response) =>
      `${request.method ?? 'UNKNOWN'} ${request.url ?? '/'} completed with ${response.statusCode}`,
    customErrorMessage: (request, response) =>
      `${request.method ?? 'UNKNOWN'} ${request.url ?? '/'} failed with ${response.statusCode}`,
  });
}
