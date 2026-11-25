import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Redis } from 'ioredis';

export interface StoredSession {
  userId: string;
  csrfTokenHash: string;
}

export interface CreatedSession {
  sessionToken: string;
  csrfToken: string;
}

export class SessionService {
  constructor(
    private readonly redis: Redis,
    private readonly secret: string,
    private readonly ttlSeconds: number,
  ) {}

  private digest(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  private key(token: string): string {
    return `shopsphere:session:${this.digest(token)}`;
  }

  createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async create(userId: string): Promise<CreatedSession> {
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = this.createCsrfToken();
    const session: StoredSession = { userId, csrfTokenHash: this.digest(csrfToken) };
    await this.redis.set(this.key(sessionToken), JSON.stringify(session), 'EX', this.ttlSeconds);
    return { sessionToken, csrfToken };
  }

  async get(sessionToken: string): Promise<StoredSession | null> {
    const key = this.key(sessionToken);
    const serialized = await this.redis.get(key);
    if (!serialized) return null;

    try {
      const parsed = JSON.parse(serialized) as Partial<StoredSession>;
      if (typeof parsed.userId !== 'string' || typeof parsed.csrfTokenHash !== 'string') {
        await this.redis.del(key);
        return null;
      }
      await this.redis.expire(key, this.ttlSeconds);
      return { userId: parsed.userId, csrfTokenHash: parsed.csrfTokenHash };
    } catch {
      await this.redis.del(key);
      return null;
    }
  }

  async rotateCsrf(sessionToken: string): Promise<string | null> {
    const session = await this.get(sessionToken);
    if (!session) return null;
    const csrfToken = this.createCsrfToken();
    await this.redis.set(
      this.key(sessionToken),
      JSON.stringify({ ...session, csrfTokenHash: this.digest(csrfToken) }),
      'EX',
      this.ttlSeconds,
    );
    return csrfToken;
  }

  verifyCsrf(session: StoredSession, csrfToken: string): boolean {
    const actual = Buffer.from(this.digest(csrfToken), 'hex');
    const expected = Buffer.from(session.csrfTokenHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  delete(sessionToken: string): Promise<number> {
    return this.redis.del(this.key(sessionToken));
  }
}
