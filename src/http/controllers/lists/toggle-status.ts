import type { FastifyReply, FastifyRequest } from 'fastify'
import { ToggleListStatusUseCase } from '@/use-cases/toggle-list-status'

interface ToggleStatusParams {
  listId: string
}

export async function toggleListStatus(
  request: FastifyRequest<{
    Params: ToggleStatusParams
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.sub
  const { listId } = request.params

  const useCase = new ToggleListStatusUseCase()

  const { list } = await useCase.execute({
    userId,
    listId,
  })

  return reply.status(200).send(list)
}
