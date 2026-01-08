import type { FastifyReply, FastifyRequest } from 'fastify'
import { AuthenticateUserUseCase } from '../../../use-cases/authenticate-user'
import { AuthenticateBody } from '../../../types/user-types'

export async function authenticate(
  request: FastifyRequest<{
    Body: AuthenticateBody
  }>,
  reply: FastifyReply,
) {
  const { email, password } = request.body

  console.log('🚀 ~ authenticate ~ email, password:', email, password)

  const authenticateUserUseCase = new AuthenticateUserUseCase()

  const { user } = await authenticateUserUseCase.execute({
    email,
    password,
  })

  const token = await reply.jwtSign(
    {
      sub: user.id,
    },
    {
      sign: {
        expiresIn: '7d',
      },
    },
  )

  return reply.status(200).send({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  })
}
