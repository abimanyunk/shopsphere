import { z } from 'zod';

export const checkoutSchema = z
  .object({
    shipping: z
      .object({
        name: z.string().trim().min(1).max(200),
        addressLine1: z.string().trim().min(1).max(200),
        addressLine2: z.string().trim().max(200).nullable().optional(),
        city: z.string().trim().min(1).max(120),
        state: z.string().trim().min(1).max(120),
        postalCode: z.string().trim().min(2).max(30),
        country: z
          .string()
          .trim()
          .length(2)
          .regex(/^[A-Za-z]{2}$/)
          .transform((value) => value.toUpperCase()),
      })
      .strict(),
    payment: z
      .object({
        method: z.literal('SIMULATED'),
        outcome: z.enum(['SUCCEEDED', 'FAILED']),
      })
      .strict(),
  })
  .strict();

export const orderListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export const orderIdSchema = z.uuid();

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
