import { db } from '../db/connection'
import { lists, items } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../errors/app-error'

interface EditListRequest {
  listId: string
  userId: string
  description?: string
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
    description,
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

    return await db.transaction(async (tx) => {
      // 1. Update basic info (event_date and description only - location cannot be changed)
      await tx
        .update(lists)
        .set({
          description: description !== undefined ? description : existingList.description,
          event_date: event_date || existingList.event_date,
          updated_at: new Date(),
          updated_by: userId,
        })
        .where(eq(lists.id, listId))

      // 2. Process items if provided
      if (inputItems) {
        const currentItems = await tx
          .select()
          .from(items)
          .where(eq(items.list_id, listId))

        const currentItemNames = new Set(currentItems.map((i) => i.item_name))
        const inputItemNames = new Set(inputItems.map((i) => i.item_name))

        // Handle item removals
        for (const itemName of currentItemNames) {
          if (!inputItemNames.has(itemName)) {
            const hasMembers = currentItems.some(
              (i) => i.item_name === itemName && i.member_name !== null,
            )

            if (hasMembers) {
              throw new AppError(
                `O item "${itemName}" possui membros cadastrados e não pode ser removido.`,
                400,
              )
            }

            await tx
              .delete(items)
              .where(
                and(eq(items.list_id, listId), eq(items.item_name, itemName)),
              )
          }
        }

        // Handle additions and edits
        for (const item of inputItems) {
          const existingParcels = currentItems.filter(
            (p) => p.item_name === item.item_name,
          )

          if (existingParcels.length === 0) {
            // New item - create parcels
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
            // Existing item - check for changes
            const currentTotal = existingParcels.length
            const newTotal = Math.ceil(
              item.quantity_total / item.quantity_per_portion,
            )

            const hasMembersRegistered = existingParcels.some(
              (p) => p.member_name !== null,
            )

            if (hasMembersRegistered) {
              // Item has members - apply restrictions
              const nameChanged = existingParcels[0].item_name !== item.item_name
              const perPortionChanged =
                existingParcels[0].quantity_per_portion !==
                item.quantity_per_portion.toString()
              const unitChanged =
                existingParcels[0].unit_type !== item.unit_type

              if (nameChanged) {
                throw new AppError(
                  `O item "${existingParcels[0].item_name}" possui membros cadastrados. Não é possível alterar o nome.`,
                  400,
                )
              }

              if (perPortionChanged) {
                throw new AppError(
                  `O item "${item.item_name}" possui membros cadastrados. Não é possível alterar a quantidade por porção.`,
                  400,
                )
              }

              if (unitChanged) {
                throw new AppError(
                  `O item "${item.item_name}" possui membros cadastrados. Não é possível alterar a unidade de medida.`,
                  400,
                )
              }

              const takenParcels = existingParcels.filter(
                (p) => p.member_name !== null,
              )
              const freeParcels = existingParcels.filter(
                (p) => p.member_name === null,
              )

              if (newTotal < takenParcels.length) {
                throw new AppError(
                  `O item "${item.item_name}" possui ${takenParcels.length} parcela(s) com membros. Não é possível reduzir para menos de ${takenParcels.length} parcela(s).`,
                  400,
                )
              }

              // Can only add or remove free parcels
              if (newTotal > currentTotal) {
                const toAdd = newTotal - currentTotal
                const itemsToInsert = Array.from({ length: toAdd }).map(
                  (_, index) => ({
                    list_id: listId,
                    item_name: item.item_name,
                    quantity_per_portion: existingParcels[0].quantity_per_portion,
                    unit_type: existingParcels[0].unit_type,
                    position: currentTotal + index,
                  }),
                )
                await tx.insert(items).values(itemsToInsert)
              } else if (newTotal < currentTotal) {
                const toRemove = currentTotal - newTotal
                const idsToDelete = freeParcels
                  .slice(0, toRemove)
                  .map((p) => p.id)

                for (const id of idsToDelete) {
                  await tx.delete(items).where(eq(items.id, id))
                }
              }
            } else {
              // No members - can make any changes
              const quantityChanged = currentTotal !== newTotal
              const perPortionChanged =
                existingParcels[0].quantity_per_portion !==
                item.quantity_per_portion.toString()
              const unitChanged =
                existingParcels[0].unit_type !== item.unit_type

              if (quantityChanged || perPortionChanged || unitChanged) {
                // Delete old parcels and create new ones
                await tx
                  .delete(items)
                  .where(
                    and(
                      eq(items.list_id, listId),
                      eq(items.item_name, existingParcels[0].item_name),
                    ),
                  )

                if (newTotal > 0) {
                  const itemsToInsert = Array.from({ length: newTotal }).map(
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
              }
            }
          }
        }
      }

      return await tx.query.lists.findFirst({ where: eq(lists.id, listId) })
    })
  }
}
