import { and, eq } from 'drizzle-orm'
import { db } from '@/db/connection'
import { items, lists } from '@/db/schema'
import { CheckListCreationAllowedUseCase } from './check-list-creation-allowed'
import { AppError } from '@/errors/app-error'

interface CreateListFromTemplateRequest {
  userId: string
  templateListId: string
}

export class CreateListFromTemplateUseCase {
  async execute({ userId, templateListId }: CreateListFromTemplateRequest) {
    const result = await db.transaction(async (tx) => {
      // 1. Verificar limite de assinatura DENTRO da transação (evita race condition)
      const checkLimit = new CheckListCreationAllowedUseCase()
      const { allowed, reason } = await checkLimit.execute({ userId })

      if (!allowed) {
        throw new AppError(reason || 'Limite de listas atingido', 403)
      }

      // 2. Buscar lista modelo (apenas do proprio usuario)
      const templateList = await tx.query.lists.findFirst({
        where: and(eq(lists.id, templateListId), eq(lists.user_id, userId)),
        with: { items: true },
      })

      if (!templateList) {
        throw new AppError('Lista modelo não encontrada', 404)
      }

      // 3. Validar se template possui itens
      if (!templateList.items || templateList.items.length === 0) {
        throw new AppError('Lista modelo não possui itens para copiar', 400)
      }

      // 4. Calcular data futura (amanha)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 5. Criar nova lista com mesmo location e description
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

      // 6. Copiar todos os items do template (SEM member_name/cpf)
      // Ordenar por position e recalcular sequencialmente para evitar gaps
      const sortedItems = [...templateList.items].sort(
        (a, b) => a.position - b.position,
      )

      const newItems = sortedItems.map((item, index) => ({
        list_id: newList.id,
        item_name: item.item_name,
        quantity_per_portion: item.quantity_per_portion,
        unit_type: item.unit_type,
        position: index + 1, // Recalcula sequencialmente
        // member_name, member_cpf, registered_at ficam NULL
      }))

      await tx.insert(items).values(newItems)

      return newList
    })

    return { list: result }
  }
}
