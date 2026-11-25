import { z } from 'zod';

const moneySchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'Price must be a non-negative decimal with at most 2 places');
const skuSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'SKU contains unsupported characters')
  .transform((value) => value.toUpperCase());
const imageUrlSchema = z
  .url()
  .max(2048)
  .refine(
    (value) => ['http:', 'https:'].includes(new URL(value).protocol),
    'Image URL must use HTTP or HTTPS',
  );

export const productIdSchema = z.uuid();

export const productListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().min(1).max(140).optional(),
    minPrice: moneySchema.optional(),
    maxPrice: moneySchema.optional(),
    inStock: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  })
  .strict()
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      Number(value.minPrice) <= Number(value.maxPrice),
    { message: 'minPrice cannot exceed maxPrice', path: ['minPrice'] },
  );

export const createProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(10_000),
    sku: skuSchema,
    price: moneySchema,
    stockQuantity: z.number().int().nonnegative().max(2_147_483_647),
    imageUrl: imageUrlSchema.nullable().optional(),
    categoryId: z.uuid(),
  })
  .strict();

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(10_000).optional(),
    sku: skuSchema.optional(),
    price: moneySchema.optional(),
    imageUrl: imageUrlSchema.nullable().optional(),
    categoryId: z.uuid().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const updateInventorySchema = z
  .object({ stockQuantity: z.number().int().nonnegative().max(2_147_483_647) })
  .strict();

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
