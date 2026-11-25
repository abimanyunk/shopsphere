import { randomBytes, randomUUID } from 'node:crypto';
import { OrderStatus, Prisma, type PrismaClient } from '@prisma/client';
import type { CatalogueCache } from '../../cache/catalogue-cache.js';
import { AppError } from '../../utils/app-error.js';
import type { AdminOrderListQuery } from '../admin/admin.schemas.js';
import type { CheckoutInput, OrderListQuery } from './order.schemas.js';
import { toOrderDto, type OrderDto } from './order.types.js';

export interface OrderListResult {
  orders: OrderDto[];
  meta: { page: number; limit: number; totalItems: number; totalPages: number };
}

export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cache: CatalogueCache,
  ) {}

  async checkout(userId: string, input: CheckoutInput): Promise<OrderDto> {
    const result = await this.prisma.$transaction(
      async (transaction) => {
        const cartRecord = await transaction.cart.findUnique({
          where: { userId },
        });
        if (!cartRecord) {
          throw new AppError(409, 'CART_EMPTY', 'The cart is empty');
        }
        await transaction.$queryRaw`
          SELECT id FROM carts WHERE id = ${cartRecord.id}::uuid FOR UPDATE
        `;
        const lockedCart = await transaction.cart.findUniqueOrThrow({
          where: { id: cartRecord.id },
          include: { items: true },
        });
        if (lockedCart.items.length === 0) {
          throw new AppError(409, 'CART_EMPTY', 'The cart is empty');
        }

        const productIds = [...new Set(lockedCart.items.map((item) => item.productId))].sort();
        const lockedIds = productIds.map((id) => Prisma.sql`${id}::uuid`);
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(lockedIds)}) ORDER BY id FOR UPDATE`,
        );

        const cart = await transaction.cart.findUniqueOrThrow({
          where: { id: lockedCart.id },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
              include: { product: { include: { category: true } } },
            },
          },
        });
        let subtotal = new Prisma.Decimal(0);
        for (const item of cart.items) {
          if (!item.product.isActive || !item.product.category.isActive) {
            throw new AppError(409, 'PRODUCT_UNAVAILABLE', `${item.product.name} is unavailable`);
          }
          if (item.quantity > item.product.stockQuantity) {
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Insufficient stock for ${item.product.name}`,
            );
          }
          subtotal = subtotal.add(item.product.price.mul(item.quantity));
        }

        const paymentSucceeded = input.payment.outcome === 'SUCCEEDED';
        if (paymentSucceeded) {
          for (const item of cart.items) {
            await transaction.product.update({
              where: { id: item.productId },
              data: { stockQuantity: { decrement: item.quantity } },
            });
          }
        }

        const order = await transaction.order.create({
          data: {
            orderNumber: `SS-${randomBytes(10).toString('hex').toUpperCase()}`,
            userId,
            status: paymentSucceeded ? 'CONFIRMED' : 'CANCELLED',
            subtotal,
            total: subtotal,
            shippingName: input.shipping.name,
            shippingAddressLine1: input.shipping.addressLine1,
            ...(input.shipping.addressLine2 !== undefined
              ? { shippingAddressLine2: input.shipping.addressLine2 }
              : {}),
            shippingCity: input.shipping.city,
            shippingState: input.shipping.state,
            shippingPostalCode: input.shipping.postalCode,
            shippingCountry: input.shipping.country,
            ...(paymentSucceeded ? {} : { cancelledAt: new Date() }),
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                productName: item.product.name,
                sku: item.product.sku,
                unitPrice: item.product.price,
                quantity: item.quantity,
                lineTotal: item.product.price.mul(item.quantity),
              })),
            },
            payment: {
              create: {
                method: 'SIMULATED',
                status: paymentSucceeded ? 'SUCCEEDED' : 'FAILED',
                amount: subtotal,
                reference: `SIM-${randomUUID().toUpperCase()}`,
              },
            },
          },
          include: { items: true, payment: true },
        });
        if (paymentSucceeded) {
          await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
        return { order, paymentSucceeded };
      },
      { maxWait: 5_000, timeout: 10_000 },
    );

    if (result.paymentSucceeded) {
      await this.cache.invalidate();
      return toOrderDto(result.order);
    }
    throw new AppError(
      402,
      'SIMULATED_PAYMENT_FAILED',
      'The simulated payment was declined; the cart was retained',
      { orderId: result.order.id, orderNumber: result.order.orderNumber },
    );
  }

  async list(userId: string, query: OrderListQuery): Promise<OrderListResult> {
    const where = { userId };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true, payment: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      orders: orders.map(toOrderDto),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, payment: true },
    });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    return toOrderDto(order);
  }

  async listAdmin(query: AdminOrderListQuery): Promise<OrderListResult> {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { orderNumber: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: { items: true, payment: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      orders: orders.map(toOrderDto),
      meta: {
        page: query.page,
        limit: query.limit,
        totalItems: total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async adminDetail(orderId: string): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found');
    return toOrderDto(order);
  }

  async updateStatus(orderId: string, target: OrderStatus): Promise<OrderDto> {
    if (target === OrderStatus.CANCELLED) return this.cancelOrder(orderId);
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: [OrderStatus.CONFIRMED],
      CONFIRMED: [OrderStatus.PROCESSING],
      PROCESSING: [OrderStatus.SHIPPED],
      SHIPPED: [OrderStatus.DELIVERED],
      DELIVERED: [],
      CANCELLED: [],
    };
    const order = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE
      `;
      const current = await transaction.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
      if (!current) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found');
      if (current.status === target) return current;
      if (!transitions[current.status].includes(target)) {
        throw new AppError(
          409,
          'INVALID_ORDER_STATUS_TRANSITION',
          `Order cannot move from ${current.status} to ${target}`,
        );
      }
      return transaction.order.update({
        where: { id: orderId },
        data: { status: target },
        include: { items: true, payment: true },
      });
    });
    return toOrderDto(order);
  }

  async cancel(userId: string, orderId: string): Promise<OrderDto> {
    return this.cancelOrder(orderId, userId);
  }

  private async cancelOrder(orderId: string, userId?: string): Promise<OrderDto> {
    const order = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE
        `;
        const current = await transaction.order.findFirst({
          where: { id: orderId, ...(userId ? { userId } : {}) },
          include: { items: true, payment: true },
        });
        if (!current) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order was not found');
        if (!['PENDING', 'CONFIRMED'].includes(current.status)) {
          throw new AppError(
            409,
            'ORDER_NOT_CANCELLABLE',
            'Order cannot be cancelled in its current status',
          );
        }

        const productIds = [...new Set(current.items.map((item) => item.productId))].sort();
        const lockedIds = productIds.map((id) => Prisma.sql`${id}::uuid`);
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(lockedIds)}) ORDER BY id FOR UPDATE`,
        );
        for (const item of current.items) {
          await transaction.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        if (current.payment?.status === 'SUCCEEDED') {
          await transaction.payment.update({
            where: { id: current.payment.id },
            data: { status: 'REFUNDED' },
          });
        }
        return transaction.order.update({
          where: { id: current.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
          include: { items: true, payment: true },
        });
      },
      { maxWait: 5_000, timeout: 10_000 },
    );
    await this.cache.invalidate();
    return toOrderDto(order);
  }
}
