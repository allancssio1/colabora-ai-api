import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { verifyJwt } from '../middlewares/verify-jwt'
import { createList } from '../controllers/lists/create'
import { getPublicList } from '../controllers/lists/get-public'
import { registerMember } from '../controllers/lists/register-member'
import { editList } from '../controllers/lists/edit'
import { getUserLists } from '../controllers/lists/get-user-lists'

export const listRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public routes
  app.get('/lists/:listId', getPublicList)
  app.post('/lists/:listId/register', registerMember)

  // Protected routes
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', verifyJwt)

    protectedRoutes.post('/lists', createList)
    protectedRoutes.put('/lists/:listId', editList)
    protectedRoutes.get('/lists', getUserLists)
  })
}
