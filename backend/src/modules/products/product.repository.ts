import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from './product.schemas.js';
import type { ProductWithCategory } from './product.types.js';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    query: ProductListQuery,
    publicOnly: boolean,
  ): Promise<{ products: ProductWithCategory[]; total: number }> {
    const where: Prisma.ProductWhereInput = {
      ...(publicOnly ? { isActive: true } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(publicOnly || query.category
        ? {
            category: {
              ...(publicOnly ? { isActive: true } : {}),
              ...(query.category ? { slug: query.category } : {}),
            },
          }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
      ...(query.inStock === true ? { stockQuantity: { gt: 0 } } : {}),
      ...(query.inStock === false ? { stockQuantity: 0 } : {}),
    };
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : { createdAt: 'desc' };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { products, total };
  }

  findById(id: string, publicOnly: boolean): Promise<ProductWithCategory | null> {
    return this.prisma.product.findFirst({
      where: {
        id,
        ...(publicOnly ? { isActive: true, category: { isActive: true } } : {}),
      },
      include: { category: true },
    });
  }

  create(input: CreateProductInput): Promise<ProductWithCategory> {
    const data: Prisma.ProductUncheckedCreateInput = {
      name: input.name,
      description: input.description,
      sku: input.sku,
      price: input.price,
      stockQuantity: input.stockQuantity,
      categoryId: input.categoryId,
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    };
    return this.prisma.product.create({
      data,
      include: { category: true },
    });
  }

  update(id: string, input: UpdateProductInput): Promise<ProductWithCategory> {
    const data: Prisma.ProductUpdateInput = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.categoryId !== undefined
        ? { category: { connect: { id: input.categoryId } } }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  updateInventory(id: string, stockQuantity: number): Promise<ProductWithCategory> {
    return this.prisma.product.update({
      where: { id },
      data: { stockQuantity },
      include: { category: true },
    });
  }

  deactivate(id: string): Promise<ProductWithCategory> {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      include: { category: true },
    });
  }
}
