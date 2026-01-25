import { z } from '@/libs/zod'

export const createCheckoutBodySchema = z.object({
  plan: z.enum(['basic', 'intermediate', 'max']),
})

export const paymentStatusParamsSchema = z.object({
  transactionId: z.uuid(),
})

export const webhookQuerySchema = z.object({
  webhookSecret: z.string().optional(),
})

export const webhookBodySchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED']),
  paidAt: z.string().optional(),
})

export type CreateCheckoutInput = z.infer<typeof createCheckoutBodySchema>
export type PaymentStatusParams = z.infer<typeof paymentStatusParamsSchema>
