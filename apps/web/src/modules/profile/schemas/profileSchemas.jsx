import { z } from 'zod';

export const profileSchemas = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'errors.required_email')
    .email('errors.invalid_email'),
});