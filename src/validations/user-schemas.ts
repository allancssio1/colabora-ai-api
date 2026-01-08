import { z } from '../libs/zod'

// Auth schemas
export const registerBodySchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6),
})

export const authenticateBodySchema = z.object({
  email: z.email(),
  password: z.string().min(6),
})
