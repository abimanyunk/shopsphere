import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

export class PasswordService {
  private readonly dummyHash = this.hash(randomBytes(32).toString('base64url'));

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verify(passwordHash: string | undefined, password: string): Promise<boolean> {
    const hash = passwordHash ?? (await this.dummyHash);
    const verified = await argon2.verify(hash, password);
    return passwordHash !== undefined && verified;
  }
}
