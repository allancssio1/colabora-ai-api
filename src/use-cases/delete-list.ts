import { eq, and } from 'drizzle-orm'
import { db } from '@/db/connection'
import { lists } from '@/db/schema'
import { AppError } from '@/errors/app-error'

interface DeleteListRequest {
  userId: string
  listId: string
}

export class DeleteListUseCase {
  async execute({ userId, listId }: DeleteListRequest) {
    // Buscar lista do usuario
    const list = await db.query.lists.findFirst({
      where: and(eq(lists.id, listId), eq(lists.user_id, userId)),
    })

    if (!list) {
      throw new AppError('Lista nao encontrada', 404)
    }

    // Deletar lista (items sao deletados em cascata pelo banco)
    await db.delete(lists).where(eq(lists.id, listId))

    return { success: true }
  }
}
