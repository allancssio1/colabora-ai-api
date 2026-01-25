import type { FastifyReply, FastifyRequest } from 'fastify'
import { CreateListFromTemplateUseCase } from '@/use-cases/create-list-from-template'
import { CheckListCreationAllowedUseCase } from '@/use-cases/check-list-creation-allowed'
import { AppError } from '@/errors/app-error'

interface CreateListFromTemplateBody {
  template_list_id: string
}

export async function createListFromTemplate(
  request: FastifyRequest<{
    Body: CreateListFromTemplateBody
  }>,
  reply: FastifyReply,
) {
  const userId = request.user.sub
  const { template_list_id } = request.body

  // Verificar se pode criar lista (limite do plano)
  const checkLimit = new CheckListCreationAllowedUseCase()
  const { allowed, reason } = await checkLimit.execute({ userId })

  if (!allowed) {
    throw new AppError(reason || 'Limite de listas atingido', 403)
  }

  const useCase = new CreateListFromTemplateUseCase()

  const { list } = await useCase.execute({
    userId,
    templateListId: template_list_id,
  })

  return reply.status(201).send(list)
}
