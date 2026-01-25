import { eq, and } from 'drizzle-orm'
import { db } from '@/db/connection'
import { lists } from '@/db/schema'
import { AppError } from '@/errors/app-error'

interface ToggleListStatusRequest {
  userId: string
  listId: string
}

export class ToggleListStatusUseCase {
  async execute({ userId, listId }: ToggleListStatusRequest) {
    // Buscar lista do usuario
    const list = await db.query.lists.findFirst({
      where: and(eq(lists.id, listId), eq(lists.user_id, userId)),
    })

    if (!list) {
      throw new AppError('Lista nao encontrada', 404)
    }

    // Alternar status
    const newStatus = list.status === 'active' ? 'archived' : 'active'

    const [updatedList] = await db
      .update(lists)
      .set({
        status: newStatus,
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(eq(lists.id, listId))
      .returning()

    return { list: updatedList }
  }
}
