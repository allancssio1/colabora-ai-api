import type { FastifyReply, FastifyRequest } from 'fastify'
import { DeleteListUseCase } from '../../../use-cases/delete-list'

interface DeleteListParams {
  listId: string
}

export async function deleteList(
  request: FastifyRequest<{
    Params: DeleteListParams
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.sub
  const { listId } = request.params

  const useCase = new DeleteListUseCase()

  await useCase.execute({
    userId,
    listId,
  })

  return reply.status(204).send()
}
