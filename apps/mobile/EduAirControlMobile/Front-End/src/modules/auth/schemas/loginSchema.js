import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'errors.required_email')
    .email('errors.invalid_email')
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(6, 'errors.password_min'),
  // companyCode ya no se pide: ms-security valida solo email + password
  // (LoginRequest de ms-security) y el codigo de empresa se asigna en el
  // onboarding tras un login social. Exigirlo aqui bloqueaba el acceso.
})