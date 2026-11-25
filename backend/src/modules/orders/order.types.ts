import type { Prisma } from '@prisma/client';

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: { items: true; payment: true };
}>;

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  total: string;
  shipping: {
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }>;
  payment: {
    method: string;
    status: string;
    amount: string;
    reference: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export function toOrderDto(order: OrderWithDetails): OrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal.toFixed(2),
    total: order.total.toFixed(2),
    shipping: {
      name: order.shippingName,
      addressLine1: order.shippingAddressLine1,
      addressLine2: order.shippingAddressLine2,
      city: order.shippingCity,
      state: order.shippingState,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      unitPrice: item.unitPrice.toFixed(2),
      quantity: item.quantity,
      lineTotal: item.lineTotal.toFixed(2),
    })),
    payment: order.payment
      ? {
          method: order.payment.method,
          status: order.payment.status,
          amount: order.payment.amount.toFixed(2),
          reference: order.payment.reference,
        }
      : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
  };
}
