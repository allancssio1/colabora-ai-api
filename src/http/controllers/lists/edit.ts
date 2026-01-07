import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { EditListUseCase } from '../../../use-cases/edit-list'

export async function editList(request: FastifyRequest, reply: FastifyReply) {
  const editListParamsSchema = z.object({
    listId: z.string().uuid(),
  })
  
  const editListBodySchema = z.object({
    mode: z.enum(['continue', 'reset']),
    location: z.string().optional(),
    event_date: z.coerce.date().optional(),
    items: z.array(
      z.object({
        item_name: z.string(),
        quantity_total: z.number().positive(),
        unit_type: z.string(),
        quantity_per_portion: z.number().positive(),
      })
    ).optional(),
  })

  // Authenticated user
  const userId = request.user.sub

  const { listId } = editListParamsSchema.parse(request.params)
  const { mode, location, event_date, items } = editListBodySchema.parse(request.body)

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
