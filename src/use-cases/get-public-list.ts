import { eq, asc, and } from 'drizzle-orm'
import { db } from '../db/connection'
import { lists, items } from '../db/schema'
import { AppError } from '../errors/app-error'

interface GetPublicListRequest {
  listId: string
}

export class GetPublicListUseCase {
  async execute({ listId }: GetPublicListRequest) {
    // Check if list exists and is active? (Requirement: "Se não existir ou estiver arquivada e for uma política não exibir, retornar erro")
    const list = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
      columns: {
        id: true,
        location: true,
        event_date: true,
        status: true,
        // user_id is internal, maybe not needed publicly except debugging
      },
    })

    if (!list) {
      throw new AppError('List not found', 404)
    }

    if (list.status === 'archived') {
       // Optional policy: allow viewing archived for history? Prompt says "Se ... política não exibir". Let's block it for now or return a specific status.
       // Actually frontend might want to show "This list is closed", so let's return it but frontend handles it. 
       // However, requirements say "Lista antiga deve ser preservada...".
       // Let's assume public access allowed but actions blocked.
    }

    const listItems = await db.query.items.findMany({
      where: eq(items.list_id, listId),
      orderBy: [asc(items.position)],
      columns: {
        id: true,
        item_name: true,
        quantity_per_portion: true,
        unit_type: true,
        member_name: true,
        member_cpf: true,
      },
    })

    return {
      list: {
        ...list,
        items: listItems,
      },
    }
  }
}
