import { z } from '@/libs/zod'

// Auth schemas
export const registerBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  phone: z.string().min(10, 'Telefone deve ter no mínimo 10 dígitos').max(11, 'Telefone deve ter no máximo 11 dígitos'),
})

export const authenticateBodySchema = z.object({
  email: z.email(),
  password: z.string().min(6),
})
