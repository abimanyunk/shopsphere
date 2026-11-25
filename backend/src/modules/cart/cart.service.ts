import type { CartRepository } from './cart.repository.js';
import { calculateCart, CartDataError } from './cart.repository.js';
import type { AddCartItemInput, UpdateCartItemInput } from './cart.schemas.js';
import type { CartDto } from './cart.types.js';
import { AppError } from '../../utils/app-error.js';

export class CartService {
  constructor(private readonly carts: CartRepository) {}

  async get(userId: string): Promise<CartDto> {
    const cart = await this.carts.getByUserId(userId);
    if (!cart) return { id: null, items: [], subtotal: '0.00', total: '0.00' };
    const calculated = calculateCart(cart.items);
    return {
      id: cart.id,
      items: calculated.items.map(({ item, lineTotal }) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.product.price.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          imageUrl: item.product.imageUrl,
          stockQuantity: item.product.stockQuantity,
          isAvailable: item.product.isActive && item.product.category.isActive,
        },
      })),
      subtotal: calculated.subtotal.toFixed(2),
      total: calculated.subtotal.toFixed(2),
    };
  }

  async add(userId: string, input: AddCartItemInput): Promise<CartDto> {
    try {
      await this.carts.add(userId, input.productId, input.quantity);
      return await this.get(userId);
    } catch (error) {
      this.translate(error);
    }
  }

  async update(userId: string, itemId: string, input: UpdateCartItemInput): Promise<CartDto> {
    try {
      await this.carts.update(userId, itemId, input.quantity);
      return await this.get(userId);
    } catch (error) {
      this.translate(error);
    }
  }

  async remove(userId: string, itemId: string): Promise<CartDto> {
    try {
      await this.carts.remove(userId, itemId);
      return await this.get(userId);
    } catch (error) {
      this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (error instanceof CartDataError) {
      if (error.code === 'CART_ITEM_NOT_FOUND') {
        throw new AppError(404, error.code, 'Cart item was not found');
      }
      if (error.code === 'INSUFFICIENT_STOCK') {
        throw new AppError(409, error.code, 'Requested quantity exceeds available stock');
      }
      throw new AppError(409, error.code, 'Product is not available');
    }
    throw error;
  }
}
