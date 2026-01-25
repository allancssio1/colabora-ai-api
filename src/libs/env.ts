import { z } from './zod'
import 'dotenv/config'

export const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'test', 'prod']).default('dev'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(1),
  // Abacate Pay
  ABACATE_PAY_API_KEY: z.string().min(1),
  ABACATE_PAY_WEBHOOK_SECRET: z.string().min(1),
  ABACATE_PAY_API_URL: z.url().optional(),
  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.email().optional(),
})

export const env = envSchema.parse(process.env)
