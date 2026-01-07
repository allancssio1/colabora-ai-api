import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticate } from '../controllers/auth/authenticate'
import { register } from '../controllers/auth/register'

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/auth/register', register)
  app.post('/auth/login', authenticate)
}
