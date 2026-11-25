import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.url(),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  DEPENDENCY_TIMEOUT_MS: z.coerce.number().int().positive().default(2_000),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604_800),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  CATALOG_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().nonnegative().default(5),
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration. Check: ${fields}`);
  }

  return result.data;
}
