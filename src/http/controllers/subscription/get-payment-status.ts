import { FastifyRequest, FastifyReply } from 'fastify'
import { GetPaymentStatusUseCase } from '@/use-cases/get-payment-status'

interface GetPaymentStatusParams {
  transactionId: string
}

export async function getPaymentStatus(
  request: FastifyRequest<{ Params: GetPaymentStatusParams }>,
  reply: FastifyReply,
) {
  const { transactionId } = request.params

  const getStatus = new GetPaymentStatusUseCase()
  const status = await getStatus.execute({ transactionId })

  return reply.send(status)
}
