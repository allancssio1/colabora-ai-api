import { FastifyRequest, FastifyReply } from 'fastify'
import { ProcessPaymentWebhookUseCase } from '@/use-cases/process-payment-webhook'
import { AbacatePayService } from '@/services/abacate-pay.service'
import { env } from '@/libs/env'

interface WebhookQuery {
  webhookSecret?: string
}

interface WebhookBody {
  id: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'
  paidAt?: string
}

export async function handleWebhook(
  request: FastifyRequest<{ Querystring: WebhookQuery; Body: WebhookBody }>,
  reply: FastifyReply,
) {
  const { webhookSecret } = request.query

  // Validar webhook secret na query
  if (webhookSecret !== env.ABACATE_PAY_WEBHOOK_SECRET) {
    return reply.status(401).send({ error: 'Invalid webhook secret' })
  }

  // Validar assinatura do webhook (header X-Webhook-Signature)
  const signature = request.headers['x-webhook-signature'] as string | undefined

  if (signature) {
    const abacatePay = new AbacatePayService()
    const rawBody = JSON.stringify(request.body)

    if (!abacatePay.verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid webhook signature' })
    }
  }

  const processWebhook = new ProcessPaymentWebhookUseCase()
  const result = await processWebhook.execute({ payload: request.body })

  return reply.send(result)
}
