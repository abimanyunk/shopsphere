import type { CatalogueCache } from '../../cache/catalogue-cache.js';
import { AppError } from '../../utils/app-error.js';
import type { CategoryRepository } from './category.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schemas.js';
import { toCategoryDto, type CategoryDto } from './category.types.js';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function isMissingRecordError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025';
}

export class CategoryService {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogueCache,
  ) {}

  async listPublic(): Promise<CategoryDto[]> {
    const cached = await this.cache.get<CategoryDto[]>('categories', 'active');
    if (cached.value) return cached.value;
    const result = (await this.categories.list(true)).map(toCategoryDto);
    await this.cache.set('categories', 'active', result, cached.version);
    return result;
  }

  async listAdmin(): Promise<CategoryDto[]> {
    return (await this.categories.list(false)).map(toCategoryDto);
  }

  async create(input: CreateCategoryInput): Promise<CategoryDto> {
    try {
      const result = toCategoryDto(await this.categories.create(input));
      await this.cache.invalidate();
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(409, 'CATEGORY_SLUG_EXISTS', 'A category with this slug already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    try {
      const result = toCategoryDto(await this.categories.update(id, input));
      await this.cache.invalidate();
      return result;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(409, 'CATEGORY_SLUG_EXISTS', 'A category with this slug already exists');
      }
      if (isMissingRecordError(error)) {
        throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category was not found');
      }
      throw error;
    }
  }
}
