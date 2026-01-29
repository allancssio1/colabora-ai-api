import type { FastifyReply, FastifyRequest } from 'fastify'
import { RegisterUserUseCase } from '@/use-cases/register-user'
import { RegisterBody } from '@/types/user-types'

export async function register(
  request: FastifyRequest<{
    Body: RegisterBody
  }>,
  reply: FastifyReply,
) {
  const { name, email, password, cpf, phone } = request.body

  const registerUserUseCase = new RegisterUserUseCase()

  const { user } = await registerUserUseCase.execute({
    name,
    email,
    password,
    cpf,
    phone,
  })

  return reply.status(201).send({ user })
}
