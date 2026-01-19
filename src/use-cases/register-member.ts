import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../db/connection'
import { lists, items } from '../db/schema'
import { AppError } from '../errors/app-error'

interface RegisterMemberRequest {
  itemId: string
  listId: string
  name: string
  cpf: string
}

export class RegisterMemberUseCase {
  async execute({ itemId, listId, name, cpf }: RegisterMemberRequest) {
    // 1. Check list valid and time
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })

    if (!list) {
      throw new AppError('List not found', 404)
    }

    if (list.status === 'archived') {
      throw new AppError('Esta lista esta inativa. Nao e possivel se registrar.', 400)
    }

    if (new Date() >= list.event_date) {
      throw new AppError('Lista finalizada. Nao e possivel se registrar.', 400)
    }

    // 2. Check item valid and available
    const item = await db.query.items.findFirst({
      where: and(eq(items.id, itemId), eq(items.list_id, listId)),
    })

    if (!item) {
      throw new AppError('Item not found in this list', 404)
    }

    if (item.member_name || item.member_cpf) {
      throw new AppError('Este item já foi escolhido. Escolha outro.', 409)
    }

    // 3. Update item
    const [updatedItem] = await db
      .update(items)
      .set({
        member_name: name,
        member_cpf: cpf, // TODO: Validate CPF format before calling this use case
        registered_at: new Date(),
      })
      .where(eq(items.id, itemId))
      .returning()

    return { item: updatedItem }
  }
}
