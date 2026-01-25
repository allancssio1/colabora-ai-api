import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '@/http/controllers/auth/authenticate'
import { register } from '@/http/controllers/auth/register'
import {
  registerBodySchema,
  authenticateBodySchema,
} from '@/validations/user-schemas'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/register',
    {
      schema: {
        body: registerBodySchema,
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
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
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    authenticate,
  )
}
