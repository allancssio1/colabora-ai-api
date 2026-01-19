import { and, eq } from 'drizzle-orm'
import { db } from '../db/connection'
import { items, lists } from '../db/schema'

interface CreateListFromTemplateRequest {
  userId: string
  templateListId: string
}

export class CreateListFromTemplateUseCase {
  async execute({ userId, templateListId }: CreateListFromTemplateRequest) {
    const result = await db.transaction(async (tx) => {
      // 1. Buscar lista modelo (apenas do proprio usuario)
      const templateList = await tx.query.lists.findFirst({
        where: and(eq(lists.id, templateListId), eq(lists.user_id, userId)),
        with: { items: true },
      })

      if (!templateList) {
        throw new Error('Lista modelo nao encontrada')
      }

      // 2. Calcular data futura (amanha)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 3. Criar nova lista com mesmo location e description
      const [newList] = await tx
        .insert(lists)
        .values({
          location: templateList.location,
          description: templateList.description,
          event_date: tomorrow,
          user_id: userId,
          status: 'active',
        })
        .returning()

      // 4. Copiar todos os items do template (SEM member_name/cpf)
      if (templateList.items.length > 0) {
        const newItems = templateList.items.map((item) => ({
          list_id: newList.id,
          item_name: item.item_name,
          quantity_per_portion: item.quantity_per_portion,
          unit_type: item.unit_type,
          position: item.position,
          // member_name, member_cpf, registered_at ficam NULL
        }))

        await tx.insert(items).values(newItems)
      }

      return newList
    })

    return { list: result }
  }
}
