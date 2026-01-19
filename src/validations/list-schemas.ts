import { z } from '../libs/zod'

// List item schema
const listItemSchema = z.object({
  item_name: z.string(),
  quantity_total: z.number().positive(),
  unit_type: z.string(),
  quantity_per_portion: z.number().positive(),
})

// Params schemas
export const listIdParamsSchema = z.object({
  listId: z.uuid(),
})

export const listIdStringParamsSchema = z.object({
  listId: z.uuid(),
})

export const unregisterMemberParamsSchema = z.object({
  listId: z.uuid(),
  itemId: z.uuid(),
})

// Body schemas
export const createListBodySchema = z.object({
  location: z.string(),
  description: z.string().optional(),
  event_date: z.coerce.date(),
  items: z.array(listItemSchema),
})

export const registerMemberBodySchema = z.object({
  item_id: z.uuid(),
  name: z.string().min(1),
  cpf: z.string().length(11),
})

export const editListBodySchema = z.object({
  description: z.string().optional(),
  event_date: z.coerce.date().optional(),
  items: z.array(listItemSchema).optional(),
})

export const createListFromTemplateBodySchema = z.object({
  template_list_id: z.uuid(),
})
