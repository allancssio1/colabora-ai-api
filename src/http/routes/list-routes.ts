import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { verifyJwt } from '../middlewares/verify-jwt'
import { createList } from '../controllers/lists/create'
import { getPublicList } from '../controllers/lists/get-public'
import { registerMember } from '../controllers/lists/register-member'
import { editList } from '../controllers/lists/edit'
import { getUserLists } from '../controllers/lists/get-user-lists'
import { unregisterMember } from '../controllers/lists/unregister-member'
import {
  listIdParamsSchema,
  listIdStringParamsSchema,
  createListBodySchema,
  registerMemberBodySchema,
  editListBodySchema,
  unregisterMemberParamsSchema,
} from '../../validations/list-schemas'

export const listRoutes: FastifyPluginAsyncZod = async (app) => {
  // Public routes
  app.get(
    '/lists/:listId',
    {
      schema: {
        params: listIdParamsSchema,
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
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
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    registerMember,
  )

  app.delete(
    '/lists/:listId/items/:itemId/register',
    {
      schema: {
        params: unregisterMemberParamsSchema,
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    unregisterMember,
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
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
          },
        },
      },
      createList,
    )

    protectedApp.get(
      '/lists',
      {
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
          },
        },
      },
      getUserLists,
    )

    protectedApp.put(
      '/lists/:listId',
      {
        schema: {
          params: listIdStringParamsSchema,
          body: editListBodySchema,
        },
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
          },
        },
      },
      editList,
    )
  })
}
