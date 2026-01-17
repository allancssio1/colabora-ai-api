import { db } from '../db/connection'
import { lists, items } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../errors/app-error'

interface EditListRequest {
  listId: string
  userId: string
  mode: 'continue' | 'reset'
  location?: string
  event_date?: Date
  items?: {
    item_name: string
    quantity_total: number
    unit_type: string
    quantity_per_portion: number
  }[]
}

export class EditListUseCase {
  async execute({
    listId,
    userId,
    mode,
    location,
    event_date,
    items: inputItems,
  }: EditListRequest) {
    const existingList = await db.query.lists.findFirst({
      where: eq(lists.id, listId),
    })

    if (!existingList) {
      throw new AppError('List not found', 404)
    }

    if (existingList.user_id !== userId) {
      throw new AppError('Unauthorized', 403)
    }

    // Transaction
    return await db.transaction(async (tx) => {
      if (mode === 'reset') {
        // Archive old list
        await tx
          .update(lists)
          .set({ status: 'archived' })
          .where(eq(lists.id, listId))

        // Create new list
        const [newList] = await tx
          .insert(lists)
          .values({
            location: location || existingList.location,
            event_date: event_date || existingList.event_date,
            user_id: userId,
            status: 'active',
          })
          .returning()

        // Create items fresh
        if (inputItems) {
          for (const item of inputItems) {
            const numParcelas = Math.ceil(
              item.quantity_total / item.quantity_per_portion,
            )
            if (numParcelas > 0) {
              const itemsToInsert = Array.from({ length: numParcelas }).map(
                (_, index) => ({
                  list_id: newList.id,
                  item_name: item.item_name,
                  quantity_per_portion: item.quantity_per_portion.toString(),
                  unit_type: item.unit_type,
                  position: index,
                }),
              )
              await tx.insert(items).values(itemsToInsert)
            }
          }
        }
        return newList
      } else {
        // Continue mode
        // 1. Update basic info
        await tx
          .update(lists)
          .set({
            location: location || existingList.location,
            event_date: event_date || existingList.event_date,
            updated_at: new Date(),
            updated_by: userId,
          })
          .where(eq(lists.id, listId))

        // 2. Process items with CRUD operations
        if (inputItems) {
          // Pegar todos os items atuais do banco
          const currentItems = await tx
            .select()
            .from(items)
            .where(eq(items.list_id, listId))

          const currentItemNames = new Set(currentItems.map((i) => i.item_name))
          const inputItemNames = new Set(inputItems.map((i) => i.item_name))

          // Validar remoções (itens que estavam no banco mas não estão no input)
          for (const itemName of currentItemNames) {
            if (!inputItemNames.has(itemName)) {
              // Item foi removido, verificar se tinha membros
              const hasMembers = currentItems.some(
                (i) => i.item_name === itemName && i.member_name !== null,
              )

              if (hasMembers) {
                throw new AppError(
                  `O item "${itemName}" possui membros cadastrados e não pode ser removido. Use o modo "Reset" para criar uma nova lista.`,
                  400,
                )
              }

              // Deletar todas as parcelas deste item
              await tx
                .delete(items)
                .where(
                  and(eq(items.list_id, listId), eq(items.item_name, itemName)),
                )
            }
          }

          // Processar adições e edições
          for (const item of inputItems) {
            const existingParcels = currentItems.filter(
              (p) => p.item_name === item.item_name,
            )

            if (existingParcels.length === 0) {
              // NOVO ITEM - Criar parcelas
              const totalParcels = Math.ceil(
                item.quantity_total / item.quantity_per_portion,
              )
              if (totalParcels > 0) {
                const itemsToInsert = Array.from({ length: totalParcels }).map(
                  (_, index) => ({
                    list_id: listId,
                    item_name: item.item_name,
                    quantity_per_portion: item.quantity_per_portion.toString(),
                    unit_type: item.unit_type,
                    position: index,
                  }),
                )
                await tx.insert(items).values(itemsToInsert)
              }
            } else {
              // ITEM EXISTENTE - Verificar se mudou
              const currentTotal = existingParcels.length
              const newTotal = Math.ceil(
                item.quantity_total / item.quantity_per_portion,
              )

              const quantityChanged = currentTotal !== newTotal
              const perPortionChanged =
                existingParcels[0].quantity_per_portion !==
                item.quantity_per_portion.toString()
              const unitChanged =
                existingParcels[0].unit_type !== item.unit_type

              if (quantityChanged || perPortionChanged || unitChanged) {
                // Item foi editado
                const hasMembersRegistered = existingParcels.some(
                  (p) => p.member_name !== null,
                )

                if (hasMembersRegistered && quantityChanged) {
                  // Validar se pode fazer a mudança
                  const takenParcels = existingParcels.filter(
                    (p) => p.member_name !== null,
                  )
                  const freeParcels = existingParcels.filter(
                    (p) => p.member_name === null,
                  )

                  if (newTotal < takenParcels.length) {
                    throw new AppError(
                      `O item "${item.item_name}" possui ${takenParcels.length} parcelas assumidas. Não é possível reduzir para menos de ${takenParcels.length} parcelas.`,
                      400,
                    )
                  }

                  // Pode adicionar ou remover apenas parcelas livres
                  if (newTotal > currentTotal) {
                    // Adicionar parcelas
                    const toAdd = newTotal - currentTotal
                    const itemsToInsert = Array.from({ length: toAdd }).map(
                      (_, index) => ({
                        list_id: listId,
                        item_name: item.item_name,
                        quantity_per_portion:
                          item.quantity_per_portion.toString(),
                        unit_type: item.unit_type,
                        position: currentTotal + index,
                      }),
                    )
                    await tx.insert(items).values(itemsToInsert)

                    // Atualizar quantity_per_portion e unit_type dos existentes
                    await tx
                      .update(items)
                      .set({
                        quantity_per_portion:
                          item.quantity_per_portion.toString(),
                        unit_type: item.unit_type,
                      })
                      .where(
                        and(
                          eq(items.list_id, listId),
                          eq(items.item_name, item.item_name),
                        ),
                      )
                  } else if (newTotal < currentTotal) {
                    // Remover parcelas livres
                    const toRemove = currentTotal - newTotal
                    const idsToDelete = freeParcels
                      .slice(0, toRemove)
                      .map((p) => p.id)

                    for (const id of idsToDelete) {
                      await tx.delete(items).where(eq(items.id, id))
                    }

                    // Atualizar quantity_per_portion e unit_type dos restantes
                    await tx
                      .update(items)
                      .set({
                        quantity_per_portion:
                          item.quantity_per_portion.toString(),
                        unit_type: item.unit_type,
                      })
                      .where(
                        and(
                          eq(items.list_id, listId),
                          eq(items.item_name, item.item_name),
                        ),
                      )
                  } else {
                    // Apenas atualizar quantity_per_portion ou unit_type
                    await tx
                      .update(items)
                      .set({
                        quantity_per_portion:
                          item.quantity_per_portion.toString(),
                        unit_type: item.unit_type,
                      })
                      .where(
                        and(
                          eq(items.list_id, listId),
                          eq(items.item_name, item.item_name),
                        ),
                      )
                  }
                } else {
                  // Sem membros - pode fazer qualquer mudança
                  // Deletar todas as parcelas antigas
                  await tx
                    .delete(items)
                    .where(
                      and(
                        eq(items.list_id, listId),
                        eq(items.item_name, item.item_name),
                      ),
                    )

                  // Criar novas parcelas
                  if (newTotal > 0) {
                    const itemsToInsert = Array.from({ length: newTotal }).map(
                      (_, index) => ({
                        list_id: listId,
                        item_name: item.item_name,
                        quantity_per_portion:
                          item.quantity_per_portion.toString(),
                        unit_type: item.unit_type,
                        position: index,
                      }),
                    )
                    await tx.insert(items).values(itemsToInsert)
                  }
                }
              }
            }
          }
        }

        return await tx.query.lists.findFirst({ where: eq(lists.id, listId) })
      }
    })
  }
}
