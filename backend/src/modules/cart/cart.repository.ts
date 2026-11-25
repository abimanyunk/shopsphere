import { Prisma, type PrismaClient } from '@prisma/client';
import type { CartItemWithProduct } from './cart.types.js';

export class CartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByUserId(userId: string): Promise<{ id: string; items: CartItemWithProduct[] } | null> {
    return this.prisma.cart.findUnique({
      where: { userId },
      select: {
        id: true,
        items: {
          orderBy: { createdAt: 'asc' },
          include: { product: { include: { category: true } } },
        },
      },
    });
  }

  async add(userId: string, productId: string, quantity: number): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      await transaction.$queryRaw`
        SELECT id FROM carts WHERE id = ${cart.id}::uuid FOR UPDATE
      `;
      await transaction.$queryRaw`
        SELECT id FROM products WHERE id = ${productId}::uuid FOR UPDATE
      `;
      const product = await transaction.product.findFirst({
        where: { id: productId, isActive: true, category: { isActive: true } },
      });
      if (!product) throw new CartDataError('PRODUCT_UNAVAILABLE');
      const existing = await transaction.cartItem.findUnique({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
      const desiredQuantity = (existing?.quantity ?? 0) + quantity;
      if (desiredQuantity > product.stockQuantity) throw new CartDataError('INSUFFICIENT_STOCK');
      await transaction.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity: desiredQuantity },
        update: { quantity: desiredQuantity },
      });
    });
  }

  async update(userId: string, itemId: string, quantity: number): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.findUnique({ where: { userId } });
      if (!cart) throw new CartDataError('CART_ITEM_NOT_FOUND');
      await transaction.$queryRaw`
        SELECT id FROM carts WHERE id = ${cart.id}::uuid FOR UPDATE
      `;
      const item = await transaction.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id },
      });
      if (!item) throw new CartDataError('CART_ITEM_NOT_FOUND');
      await transaction.$queryRaw`
        SELECT id FROM products WHERE id = ${item.productId}::uuid FOR UPDATE
      `;
      const product = await transaction.product.findFirst({
        where: { id: item.productId, isActive: true, category: { isActive: true } },
      });
      if (!product) throw new CartDataError('PRODUCT_UNAVAILABLE');
      if (quantity > product.stockQuantity) throw new CartDataError('INSUFFICIENT_STOCK');
      await transaction.cartItem.update({ where: { id: itemId }, data: { quantity } });
    });
  }

  async remove(userId: string, itemId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.findUnique({ where: { userId } });
      if (!cart) throw new CartDataError('CART_ITEM_NOT_FOUND');
      await transaction.$queryRaw`
        SELECT id FROM carts WHERE id = ${cart.id}::uuid FOR UPDATE
      `;
      const result = await transaction.cartItem.deleteMany({
        where: { id: itemId, cartId: cart.id },
      });
      if (result.count === 0) throw new CartDataError('CART_ITEM_NOT_FOUND');
    });
  }
}

export class CartDataError extends Error {
  constructor(
    public readonly code: 'PRODUCT_UNAVAILABLE' | 'INSUFFICIENT_STOCK' | 'CART_ITEM_NOT_FOUND',
  ) {
    super(code);
  }
}

export function calculateCart(items: CartItemWithProduct[]): {
  items: CartItemDtoInternal[];
  subtotal: Prisma.Decimal;
} {
  let subtotal = new Prisma.Decimal(0);
  const mapped = items.map((item) => {
    const lineTotal = item.product.price.mul(item.quantity);
    subtotal = subtotal.add(lineTotal);
    return { item, lineTotal };
  });
  return { items: mapped, subtotal };
}

interface CartItemDtoInternal {
  item: CartItemWithProduct;
  lineTotal: Prisma.Decimal;
}
