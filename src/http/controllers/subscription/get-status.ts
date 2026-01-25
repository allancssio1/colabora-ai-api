import { FastifyRequest, FastifyReply } from 'fastify'
import { GetSubscriptionStatusUseCase } from '@/use-cases/get-subscription-status'

export async function getSubscriptionStatus(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub

  const getStatus = new GetSubscriptionStatusUseCase()
  const status = await getStatus.execute({ userId })

  return reply.send(status)
}
