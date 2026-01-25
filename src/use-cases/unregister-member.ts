import { eq, and } from 'drizzle-orm'
import { db } from '@/db/connection'
import { lists, items } from '@/db/schema'
import { AppError } from '@/errors/app-error'

interface UnregisterMemberRequest {
  itemId: string
  listId: string
}

export class UnregisterMemberUseCase {
  async execute({ itemId, listId }: UnregisterMemberRequest) {
    // 1. Verificar se lista existe
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })

    if (!list) {
      throw new AppError('List not found', 404)
    }

    // 2. Verificar se item existe e pertence à lista
    const item = await db.query.items.findFirst({
      where: and(eq(items.id, itemId), eq(items.list_id, listId)),
    })

    if (!item) {
      throw new AppError('Item not found in this list', 404)
    }

    // 3. Verificar se o item está realmente registrado
    if (!item.member_name && !item.member_cpf) {
      throw new AppError('Item is not registered', 400)
    }

    // 4. Limpar registro do item
    const [updatedItem] = await db
      .update(items)
      .set({
        member_name: null,
        member_cpf: null,
        registered_at: null,
      })
      .where(eq(items.id, itemId))
      .returning()

    return { item: updatedItem }
  }
}
