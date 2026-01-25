import { z } from '@/libs/zod'
import {
  listIdParamsSchema,
  listIdStringParamsSchema,
  createListBodySchema,
  registerMemberBodySchema,
  editListBodySchema,
} from '@/validations/list-schemas'

// Tipos inferidos dos schemas de params
export type ListIdParams = z.infer<typeof listIdParamsSchema>
export type ListIdStringParams = z.infer<typeof listIdStringParamsSchema>

// Tipos inferidos dos schemas de body
export type CreateListBody = z.infer<typeof createListBodySchema>
export type RegisterMemberBody = z.infer<typeof registerMemberBodySchema>
export type EditListBody = z.infer<typeof editListBodySchema>
