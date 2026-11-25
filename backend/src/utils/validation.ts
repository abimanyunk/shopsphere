import type { ZodType } from 'zod';
import { AppError } from './app-error.js';

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw new AppError(
    400,
    'VALIDATION_ERROR',
    'Request validation failed',
    result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
  );
}
