import { z } from 'zod';

const passwordSchema = z.string().min(12).max(128);
const nameSchema = z.string().trim().min(1).max(100);

export const registerSchema = z
  .object({
    email: z
      .email()
      .max(320)
      .transform((email) => email.trim().toLowerCase()),
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: z.string().trim().min(5).max(30).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .email()
      .max(320)
      .transform((email) => email.trim().toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
