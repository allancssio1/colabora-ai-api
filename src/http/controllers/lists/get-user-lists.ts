import type { FastifyReply, FastifyRequest } from 'fastify'
import { GetUserListsUseCase } from '../../../use-cases/get-user-lists'

export async function getUserLists(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { sub } = request.user
  console.log('🚀 ~ getUserLists ~ sub:', sub)

  if (!sub) {
    return reply.status(403).send({ message: 'Forbidden' })
  }

  const getUserListsUseCase = new GetUserListsUseCase()

  const { lists } = await getUserListsUseCase.execute({ userId: sub })

  return reply.status(200).send({ lists })
}
