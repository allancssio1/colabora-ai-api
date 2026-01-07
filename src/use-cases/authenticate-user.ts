import { compare } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../db/connection'
import { auth, users } from '../db/schema'
import { AppError } from '../errors/app-error'

interface AuthenticateUserRequest {
  email: string
  password: string
}

export class AuthenticateUserUseCase {
  async execute({ email, password }: AuthenticateUserRequest) {
    const userAuth = await db.query.auth.findFirst({
      where: eq(auth.email, email),
      with: {
        // We might want to fetch the related user profile if needed,
        // but for now we just need the auth record to verify password.
      },
    })

    if (!userAuth) {
      throw new AppError('Invalid credentials', 401)
    }

    const doesPasswordMatch = await compare(password, userAuth.password)

    if (!doesPasswordMatch) {
      throw new AppError('Invalid credentials', 401)
    }

    // Fetch the user profile to return ID and Name
    const userProfile = await db.query.users.findFirst({
      where: eq(users.auth_id, userAuth.id),
    })

    if (!userProfile) {
      // This should theoretically not happen due to transaction constraint but good to check
      throw new AppError('User profile not found', 500)
    }

    return {
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userAuth.email,
      },
    }
  }
}
