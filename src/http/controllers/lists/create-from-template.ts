import type { FastifyReply, FastifyRequest } from 'fastify'
import { CreateListFromTemplateUseCase } from '@/use-cases/create-list-from-template'

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

  // Verificação de limite agora está dentro do use case (evita race condition)
  const useCase = new CreateListFromTemplateUseCase()

  const { list } = await useCase.execute({
    userId,
    templateListId: template_list_id,
  })

  return reply.status(201).send(list)
}
