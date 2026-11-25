import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

export const adminOrderListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(OrderStatus).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .strict();

export const updateOrderStatusSchema = z.object({ status: z.enum(OrderStatus) }).strict();

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
