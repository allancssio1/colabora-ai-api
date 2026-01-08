import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { verifyJwt } from '../middlewares/verify-jwt'
import { createList } from '../controllers/lists/create'
import { getPublicList } from '../controllers/lists/get-public'
import { registerMember } from '../controllers/lists/register-member'
import { editList } from '../controllers/lists/edit'
import { getUserLists } from '../controllers/lists/get-user-lists'
import {
  listIdParamsSchema,
  listIdStringParamsSchema,
  createListBodySchema,
  registerMemberBodySchema,
  editListBodySchema,
} from '../../validations/list-schemas'

export const listRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public routes
  app.get(
    '/lists/:listId',
    {
      schema: {
        params: listIdParamsSchema,
      },
    },
    getPublicList,
  )

  app.post(
    '/lists/:listId/register',
    {
      schema: {
        params: listIdParamsSchema,
        body: registerMemberBodySchema,
      },
    },
    registerMember,
  )

  // Protected routes
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', verifyJwt)

    protectedApp.post(
      '/lists',
      {
        schema: {
          body: createListBodySchema,
        },
      },
      createList,
    )

    protectedApp.get('/lists', getUserLists)

    protectedApp.put(
      '/lists/:listId',
      {
        schema: {
          params: listIdStringParamsSchema,
          body: editListBodySchema,
        },
      },
      editList,
    )
  })
}
