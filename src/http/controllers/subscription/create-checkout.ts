import { FastifyRequest, FastifyReply } from 'fastify'
import { CreateSubscriptionChargeUseCase } from '@/use-cases/create-subscription-charge'
import { SubscriptionPlanType } from '@/constants/subscription-plans'

interface CreateCheckoutBody {
  plan: SubscriptionPlanType
}

export async function createCheckout(
  request: FastifyRequest<{ Body: CreateCheckoutBody }>,
  reply: FastifyReply,
) {
  const userId = request.user.sub
  const { plan } = request.body

  const createCharge = new CreateSubscriptionChargeUseCase()
  const result = await createCharge.execute({ userId, plan })

  return reply.status(201).send(result)
}
