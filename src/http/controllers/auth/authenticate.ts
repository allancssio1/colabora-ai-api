import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AuthenticateUserUseCase } from '../../../use-cases/authenticate-user'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authenticateBodySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })

  const { email, password } = authenticateBodySchema.parse(request.body)

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
    }
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
