import { z } from 'zod';

export const addCartItemSchema = z
  .object({
    productId: z.uuid(),
    quantity: z.number().int().positive().max(1000),
  })
  .strict();

export const updateCartItemSchema = z
  .object({ quantity: z.number().int().positive().max(1000) })
  .strict();

export const cartItemIdSchema = z.uuid();

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
