import type { FastifyReply, FastifyRequest } from 'fastify'
import { CreateListUseCase } from '@/use-cases/create-list'
import { CreateListBody } from '@/types/list-types'
import { CheckListCreationAllowedUseCase } from '@/use-cases/check-list-creation-allowed'
import { AppError } from '@/errors/app-error'

export async function createList(
  request: FastifyRequest<{
    Body: CreateListBody
  }>,
  reply: FastifyReply,
) {
  // Authenticated user
  const userId = request.user.sub

  // Verificar se pode criar lista (limite do plano)
  const checkLimit = new CheckListCreationAllowedUseCase()
  const { allowed, reason } = await checkLimit.execute({ userId })

  if (!allowed) {
    throw new AppError(reason || 'Limite de listas atingido', 403)
  }

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
