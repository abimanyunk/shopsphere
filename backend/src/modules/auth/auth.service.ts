import { AppError } from '../../utils/app-error.js';
import type { UserRepository } from '../users/user.repository.js';
import { toPublicUser, type PublicUser } from '../users/user.types.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { PasswordService } from './password.service.js';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
  ) {}

  async register(input: RegisterInput): Promise<PublicUser> {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      const user = await this.users.create({
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      });
      return toPublicUser(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          409,
          'EMAIL_ALREADY_EXISTS',
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<PublicUser> {
    const user = await this.users.findByEmail(input.email);
    const verified = await this.passwords.verify(user?.passwordHash, input.password);
    if (!user || !verified || !user.isActive) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    return toPublicUser(user);
  }
}
