import type { CatalogueCache } from '../../cache/catalogue-cache.js';
import { AppError } from '../../utils/app-error.js';
import type { CategoryRepository } from '../categories/category.repository.js';
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateInventoryInput,
  UpdateProductInput,
} from './product.schemas.js';
import type { ProductRepository } from './product.repository.js';
import { toProductDto, type ProductDto } from './product.types.js';

export interface ProductListResult {
  products: ProductDto[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

export class ProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly cache: CatalogueCache,
  ) {}

  async listPublic(query: ProductListQuery): Promise<ProductListResult> {
    const cached = await this.cache.get<ProductListResult>('products', query);
    if (cached.value) return cached.value;
    const result = await this.list(query, true);
    await this.cache.set('products', query, result, cached.version);
    return result;
  }

  listAdmin(query: ProductListQuery): Promise<ProductListResult> {
    return this.list(query, false);
  }

  async getPublic(id: string): Promise<ProductDto> {
    const cached = await this.cache.get<ProductDto>('product', id);
    if (cached.value) return cached.value;
    const product = await this.products.findById(id, true);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found');
    const result = toProductDto(product);
    await this.cache.set('product', id, result, cached.version);
    return result;
  }

  async create(input: CreateProductInput): Promise<ProductDto> {
    await this.requireActiveCategory(input.categoryId);
    try {
      const result = toProductDto(await this.products.create(input));
      await this.cache.invalidate();
      return result;
    } catch (error) {
      this.translateMutationError(error);
    }
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductDto> {
    if (input.categoryId) await this.requireActiveCategory(input.categoryId);
    try {
      const result = toProductDto(await this.products.update(id, input));
      await this.cache.invalidate();
      return result;
    } catch (error) {
      this.translateMutationError(error);
    }
  }

  async updateInventory(id: string, input: UpdateInventoryInput): Promise<ProductDto> {
    try {
      const result = toProductDto(await this.products.updateInventory(id, input.stockQuantity));
      await this.cache.invalidate();
      return result;
    } catch (error) {
      this.translateMutationError(error);
    }
  }

  async deactivate(id: string): Promise<ProductDto> {
    try {
      const result = toProductDto(await this.products.deactivate(id));
      await this.cache.invalidate();
      return result;
    } catch (error) {
      this.translateMutationError(error);
    }
  }

  private async list(query: ProductListQuery, publicOnly: boolean): Promise<ProductListResult> {
    const { products, total } = await this.products.list(query, publicOnly);
    return {
      products: products.map(toProductDto),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private async requireActiveCategory(categoryId: string): Promise<void> {
    const category = await this.categories.findById(categoryId);
    if (!category || !category.isActive) {
      throw new AppError(400, 'INVALID_CATEGORY', 'An active category is required');
    }
  }

  private translateMutationError(error: unknown): never {
    if (errorCode(error) === 'P2002') {
      throw new AppError(409, 'PRODUCT_SKU_EXISTS', 'A product with this SKU already exists');
    }
    if (errorCode(error) === 'P2025') {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found');
    }
    throw error;
  }
}
