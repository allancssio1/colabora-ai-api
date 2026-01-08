import { z } from '../libs/zod'
import {
  registerBodySchema,
  authenticateBodySchema,
} from '../validations/user-schemas'

// Tipos inferidos dos schemas
export type RegisterBody = z.infer<typeof registerBodySchema>
export type AuthenticateBody = z.infer<typeof authenticateBodySchema>
