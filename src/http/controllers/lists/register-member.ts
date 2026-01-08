import type { FastifyReply, FastifyRequest } from 'fastify'
import { RegisterMemberUseCase } from '../../../use-cases/register-member'
import { ListIdParams, RegisterMemberBody } from '../../../types/list-types'

export async function registerMember(
  request: FastifyRequest<{
    Body: RegisterMemberBody
    Params: ListIdParams
  }>,
  reply: FastifyReply,
) {
  const { listId } = request.params
  const { item_id, name, cpf } = request.body

  const registerMemberUseCase = new RegisterMemberUseCase()

  const { item } = await registerMemberUseCase.execute({
    listId,
    itemId: item_id,
    name,
    cpf,
  })

  return reply.status(200).send({ item })
}
