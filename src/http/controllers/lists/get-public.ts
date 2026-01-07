import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { GetPublicListUseCase } from '../../../use-cases/get-public-list'

export async function getPublicList(request: FastifyRequest, reply: FastifyReply) {
  const getPublicListParamsSchema = z.object({
    listId: z.string().uuid(),
  })

  const { listId } = getPublicListParamsSchema.parse(request.params)

  const getPublicListUseCase = new GetPublicListUseCase()

  const { list } = await getPublicListUseCase.execute({ listId })

  return reply.status(200).send(list)
}
