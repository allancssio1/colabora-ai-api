import { FastifyRequest, FastifyReply } from 'fastify'
import { CheckSubscriptionValidityUseCase } from '@/use-cases/check-subscription-validity'

declare module 'fastify' {
  interface FastifyRequest {
    subscription?: {
      isValid: boolean
      isReadOnly: boolean
      plan: string | null
      expiresAt: Date | null
      status: string | null
    }
  }
}

export async function verifySubscription(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.user.sub

  const checkValidity = new CheckSubscriptionValidityUseCase()
  const result = await checkValidity.execute({ userId })

  request.subscription = result

  if (!result.isValid && result.isReadOnly) {
    return reply.status(402).send({
      message: 'Assinatura expirada. Renove para continuar editando.',
      code: 'SUBSCRIPTION_EXPIRED',
      isReadOnly: true,
    })
  }
}
