import { FastifyRequest, FastifyReply } from 'fastify'
import { SUBSCRIPTION_PLANS, formatPrice } from '@/constants/subscription-plans'

export async function getSubscriptionPlans(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const plans = Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => ({
    id,
    name: plan.name,
    price: plan.price,
    priceFormatted: formatPrice(plan.price),
    maxLists: plan.maxLists,
  }))

  return reply.send({ plans })
}
