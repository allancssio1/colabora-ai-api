import type { FastifyReply, FastifyRequest } from 'fastify'
import { EditListUseCase } from '../../../use-cases/edit-list'
import { EditListBody, ListIdParams } from '../../../types/list-types'

export async function editList(
  request: FastifyRequest<{
    Body: EditListBody
    Params: ListIdParams
  }>,
  reply: FastifyReply,
) {
  // Authenticated user
  const userId = request.user.sub

  const { listId } = request.params
  const { mode, location, event_date, items } = request.body

  const editListUseCase = new EditListUseCase()

  const result = await editListUseCase.execute({
    listId,
    userId,
    mode,
    location,
    event_date,
    items,
  })

  return reply.status(200).send(result)
}
