import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db/connection'
import { auth, users } from '@/db/schema'
import { AppError } from '@/errors/app-error'

interface RegisterUserRequest {
  name: string
  email: string
  password: string
  cpf: string
}

export class RegisterUserUseCase {
  async execute({ name, email, password, cpf }: RegisterUserRequest) {
    const existingUser = await db.select().from(auth).where(eq(auth.email, email))

    if (existingUser.length > 0) {
      throw new AppError('User already exists', 409)
    }

    const passwordHash = await hash(password, 6)

    // Transaction to ensure both auth and user are created
    const result = await db.transaction(async (tx) => {
      const [newAuth] = await tx
        .insert(auth)
        .values({
          email,
          password: passwordHash,
        })
        .returning()

      const [newUser] = await tx
        .insert(users)
        .values({
          name,
          cpf,
          auth_id: newAuth.id,
        })
        .returning()

      return newUser
    })

    return { user: result }
  }
}
