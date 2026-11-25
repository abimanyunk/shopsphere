import type { PrismaClient, User, UserRole } from '@prisma/client';

interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role?: UserRole;
}

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

export class UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updateProfile(id: string, data: UpdateProfileData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  upsertAdmin(data: Omit<CreateUserData, 'role'>): Promise<User> {
    return this.prisma.user.upsert({
      where: { email: data.email },
      create: { ...data, role: 'ADMIN' },
      update: {
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        role: 'ADMIN',
        isActive: true,
      },
    });
  }
}
