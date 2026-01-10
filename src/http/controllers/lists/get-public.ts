import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetPublicListUseCase } from '../../../use-cases/get-public-list'
import { ListIdParams } from '../../../types/list-types'

export async function getPublicList(
  request: FastifyRequest<{
    Params: ListIdParams
  }>,
  reply: FastifyReply,
) {
  const { listId } = request.params

  const getPublicListUseCase = new GetPublicListUseCase()

  const { list } = await getPublicListUseCase.execute({ listId })

  return reply.status(200).send(list)
}
