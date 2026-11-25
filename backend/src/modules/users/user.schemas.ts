import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(100);
const phoneSchema = z.string().trim().min(5).max(30).nullable();

export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
