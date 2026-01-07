import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { RegisterMemberUseCase } from '../../../use-cases/register-member'

export async function registerMember(request: FastifyRequest, reply: FastifyReply) {
  const registerMemberParamsSchema = z.object({
    listId: z.string().uuid(),
  })
  
  const registerMemberBodySchema = z.object({
    item_id: z.string().uuid(),
    name: z.string().min(1),
    cpf: z.string().length(11).regex(/^\d+$/, 'CPF must contain only numbers'),
  })

  const { listId } = registerMemberParamsSchema.parse(request.params)
  const { item_id, name, cpf } = registerMemberBodySchema.parse(request.body)

  const registerMemberUseCase = new RegisterMemberUseCase()

  const { item } = await registerMemberUseCase.execute({
    listId,
    itemId: item_id,
    name,
    cpf,
  })

  return reply.status(200).send({ item })
}
