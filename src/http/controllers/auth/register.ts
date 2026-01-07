import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { RegisterUserUseCase } from '../../../use-cases/register-user'

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const registerBodySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    password: z.string().min(6),
  })

  const { name, email, password } = registerBodySchema.parse(request.body)

  const registerUserUseCase = new RegisterUserUseCase()

  const { user } = await registerUserUseCase.execute({
    name,
    email,
    password,
  })

  return reply.status(201).send({ user })
}
