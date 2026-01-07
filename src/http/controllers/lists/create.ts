import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { CreateListUseCase } from '../../../use-cases/create-list'

export async function createList(request: FastifyRequest, reply: FastifyReply) {
  const createListBodySchema = z.object({
    location: z.string(),
    event_date: z.coerce.date(),
    items: z.array(
      z.object({
        item_name: z.string(),
        quantity_total: z.number().positive(),
        unit_type: z.string(),
        quantity_per_portion: z.number().positive(),
      })
    ),
  })

  // Authenticated user
  const userId = request.user.sub

  const { location, event_date, items } = createListBodySchema.parse(request.body)

  const createListUseCase = new CreateListUseCase()

  const { list } = await createListUseCase.execute({
    userId,
    location,
    event_date,
    items,
  })

  return reply.status(201).send(list)
}
