import type { Category, Product } from '@prisma/client';
import type { CategoryDto } from '../categories/category.types.js';
import { toCategoryDto } from '../categories/category.types.js';

export type ProductWithCategory = Product & { category: Category };

export interface ProductDto {
  id: string;
  name: string;
  description: string;
  sku: string;
  price: string;
  stockQuantity: number;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  imageUrl: string | null;
  isActive: boolean;
  category: CategoryDto;
  createdAt: string;
  updatedAt: string;
}

export function toProductDto(product: ProductWithCategory): ProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    price: product.price.toFixed(2),
    stockQuantity: product.stockQuantity,
    availability: product.stockQuantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    category: toCategoryDto(product.category),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
