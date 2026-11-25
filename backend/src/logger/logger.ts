import pino, { type Logger } from 'pino';
import type { Environment } from '../config/env.js';

const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.sessionId',
];

export function createLogger(environment: Environment): Logger {
  const options: pino.LoggerOptions = {
    level: environment.LOG_LEVEL,
    redact: { paths: redactedPaths, censor: '[REDACTED]' },
    base: { service: 'shopsphere-backend', environment: environment.NODE_ENV },
  };

  if (environment.NODE_ENV === 'development') {
    return pino(options, pino.transport({ target: 'pino-pretty', options: { colorize: true } }));
  }

  return pino(options);
}
