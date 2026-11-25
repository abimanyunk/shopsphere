import type { Request, Response } from 'express';
import { parseInput } from '../../utils/validation.js';
import { updateProfileSchema } from './user.schemas.js';
import type { UserService } from './user.service.js';

export class UserController {
  constructor(private readonly users: UserService) {}

  profile = async (request: Request, response: Response): Promise<void> => {
    const user = await this.users.getProfile(request.auth!.user.id);
    response.json({ data: { user } });
  };

  updateProfile = async (request: Request, response: Response): Promise<void> => {
    const input = parseInput(updateProfileSchema, request.body);
    const user = await this.users.updateProfile(request.auth!.user.id, input);
    response.json({ data: { user } });
  };
}
