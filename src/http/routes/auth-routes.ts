import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../controllers/auth/authenticate'
import { register } from '../controllers/auth/register'
import {
  registerBodySchema,
  authenticateBodySchema,
} from '../../validations/user-schemas'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/register',
    {
      schema: {
        body: registerBodySchema,
      },
    },
    register,
  )

  app.post(
    '/auth/login',
    {
      schema: {
        body: authenticateBodySchema,
      },
    },
    authenticate,
  )
}
