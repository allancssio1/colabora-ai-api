import type { FastifyReply, FastifyRequest } from 'fastify'
import { UnregisterMemberUseCase } from '../../../use-cases/unregister-member'
import { ListIdParams } from '../../../types/list-types'

interface UnregisterMemberParams extends ListIdParams {
  itemId: string
}

export async function unregisterMember(
  request: FastifyRequest<{
    Params: UnregisterMemberParams
  }>,
  reply: FastifyReply,
) {
  const { listId, itemId } = request.params

  const unregisterMemberUseCase = new UnregisterMemberUseCase()

  const { item } = await unregisterMemberUseCase.execute({
    listId,
    itemId,
  })

  return reply.status(200).send({ item })
}
