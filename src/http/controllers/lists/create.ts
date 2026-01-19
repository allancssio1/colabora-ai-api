import type { FastifyReply, FastifyRequest } from 'fastify'
import { CreateListUseCase } from '../../../use-cases/create-list'
import { CreateListBody } from '../../../types/list-types'

export async function createList(
  request: FastifyRequest<{
    Body: CreateListBody
  }>,
  reply: FastifyReply,
) {
  // Authenticated user
  const userId = request.user.sub

  const { location, description, event_date, items } = request.body

  const createListUseCase = new CreateListUseCase()

  const { list } = await createListUseCase.execute({
    userId,
    location,
    description,
    event_date,
    items,
  })

  return reply.status(201).send(list)
}
