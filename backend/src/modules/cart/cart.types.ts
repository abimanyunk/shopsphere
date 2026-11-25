import type { CartItem, Category, Product } from '@prisma/client';

export type CartItemWithProduct = CartItem & { product: Product & { category: Category } };

export interface CartItemDto {
  id: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product: {
    id: string;
    name: string;
    sku: string;
    imageUrl: string | null;
    stockQuantity: number;
    isAvailable: boolean;
  };
}

export interface CartDto {
  id: string | null;
  items: CartItemDto[];
  subtotal: string;
  total: string;
}
