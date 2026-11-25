import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Logger } from 'pino';

const VERSION_KEY = 'shopsphere:catalogue:version';

export class CatalogueCache {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly ttlSeconds: number,
  ) {}

  private async version(): Promise<string> {
    const current = await this.redis.get(VERSION_KEY);
    if (current) return current;
    await this.redis.set(VERSION_KEY, '1', 'NX');
    return (await this.redis.get(VERSION_KEY)) ?? '1';
  }

  private digest(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  async get<T>(
    kind: string,
    identity: unknown,
  ): Promise<{ value: T | null; version: string | null }> {
    try {
      const version = await this.version();
      const value = await this.redis.get(
        `shopsphere:catalogue:v${version}:${kind}:${this.digest(identity)}`,
      );
      return { value: value ? (JSON.parse(value) as T) : null, version };
    } catch (error) {
      this.logger.warn({ err: error }, 'Catalogue cache read failed; using PostgreSQL');
      return { value: null, version: null };
    }
  }

  async set(
    kind: string,
    identity: unknown,
    value: unknown,
    observedVersion: string | null,
  ): Promise<void> {
    try {
      const version = observedVersion ?? (await this.version());
      await this.redis.set(
        `shopsphere:catalogue:v${version}:${kind}:${this.digest(identity)}`,
        JSON.stringify(value),
        'EX',
        this.ttlSeconds,
      );
    } catch (error) {
      this.logger.warn({ err: error }, 'Catalogue cache write failed');
    }
  }

  async invalidate(): Promise<void> {
    try {
      await this.redis.incr(VERSION_KEY);
    } catch (error) {
      this.logger.warn({ err: error }, 'Catalogue cache invalidation failed');
    }
  }
}
