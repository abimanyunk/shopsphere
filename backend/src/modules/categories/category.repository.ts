import type { Category, Prisma, PrismaClient } from '@prisma/client';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schemas.js';

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(activeOnly = true): Promise<Category[]> {
    return this.prisma.category.findMany({
      ...(activeOnly ? { where: { isActive: true } } : {}),
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(input: CreateCategoryInput): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
  }

  update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const data: Prisma.CategoryUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    return this.prisma.category.update({ where: { id }, data });
  }
}
