import { AppError } from '../../utils/app-error.js';
import type { UserRepository } from './user.repository.js';
import type { UpdateProfileInput } from './user.schemas.js';
import { toPublicUser, type PublicUser } from './user.types.js';

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) throw new AppError(404, 'USER_NOT_FOUND', 'User was not found');
    return toPublicUser(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const data = {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    };
    const user = await this.users.updateProfile(userId, data);
    return toPublicUser(user);
  }
}
