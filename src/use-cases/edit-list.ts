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
  async execute({ listId, userId, mode, location, event_date, items: inputItems }: EditListRequest) {
    const existingList = await db.query.lists.findFirst({
        where: eq(lists.id, listId)
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
            await tx.update(lists).set({ status: 'archived' }).where(eq(lists.id, listId))
            
            // Create new list
            const [newList] = await tx.insert(lists).values({
                location: location || existingList.location,
                event_date: event_date || existingList.event_date,
                user_id: userId,
                status: 'active'
            }).returning()

            // Create items fresh
            if (inputItems) {
                for (const item of inputItems) {
                    const numParcelas = Math.ceil(item.quantity_total / item.quantity_per_portion)
                    if (numParcelas > 0) {
                       const itemsToInsert = Array.from({ length: numParcelas }).map((_, index) => ({
                            list_id: newList.id,
                            item_name: item.item_name,
                            quantity_per_portion: item.quantity_per_portion.toString(),
                            unit_type: item.unit_type,
                            position: index,
                        }))
                        await tx.insert(items).values(itemsToInsert)
                    }
                }
            }
            return newList
        } else {
             // Continue mode
             // 1. Update basic info
             await tx.update(lists).set({
                location: location || existingList.location,
                event_date: event_date || existingList.event_date,
                updated_at: new Date(),
                updated_by: userId
             }).where(eq(lists.id, listId))

             // 2. Process items rewrite?
             // Prompt says: "Manter as parcelas já preenchidas... Recalcular as disponíveis"
             // This is complex. For simplest MVP compliance matching prompt logic:
             
             if (inputItems) {
                 // For each input item
                 for (const item of inputItems) {
                    // Find if this item name exists in current list
                    // Warning: item_name is not unique per list in schema, but we assume it groups "Items". 
                    // But schema `items` table is INDIVIDUAL parcels.
                    // So we must group by name to find "Product".
                    // This schema design makes "editing item quantity" hard because "Items" are actually "Parcels".
                    
                    // Strategy:
                    // 1. Count existing parcels for this item_name
                    // 2. Count how many are taken vs free.
                    // 3. Compare with new calculated total parcels.
                    // 4. Add or remove FREE parcels to match new count.
                    // 5. If we need to remove more than free, we have a problem (assumed taken are untouched).
                    
                    const existingParcels = await tx.select().from(items).where(and(eq(items.list_id, listId), eq(items.item_name, item.item_name)))
                    
                    const takenParcels = existingParcels.filter(p => p.member_name !== null)
                    const freeParcels = existingParcels.filter(p => p.member_name === null)
                    
                    const totalParcelsNeeded = Math.ceil(item.quantity_total / item.quantity_per_portion)
                    
                    // Differential
                    const currentTotal = existingParcels.length
                    
                    if (totalParcelsNeeded > currentTotal) {
                        // Add more
                        const toAdd = totalParcelsNeeded - currentTotal
                         const itemsToInsert = Array.from({ length: toAdd }).map((_, index) => ({
                            list_id: listId,
                            item_name: item.item_name,
                            quantity_per_portion: item.quantity_per_portion.toString(),
                            unit_type: item.unit_type,
                            position: currentTotal + index,
                        }))
                        await tx.insert(items).values(itemsToInsert)
                        
                    } else if (totalParcelsNeeded < currentTotal) {
                        // Remove some
                        const toRemoveCount = currentTotal - totalParcelsNeeded
                        
                        // Can only remove free parcels
                        if (toRemoveCount <= freeParcels.length) {
                             // Remove from end or start? "position" matters only for sort.
                             // Let's remove the LAST free parcels to preserve order roughly.
                             // Actually free parcels might be scattered.
                             // Requirements: "Remover parcelas... que nunca foram assumidas".
                             
                             // Let's pick 'toRemoveCount' IDs from freeParcels to delete.
                             const idsToDelete = freeParcels.slice(0, toRemoveCount).map(p => p.id)
                             // await tx.delete(items).where(and(eq(items.list_id, listId), eq(items.item_name, item.item_name), isNull(items.member_name)))
                             
                              for (const idToDelete of idsToDelete) {
                                  await tx.delete(items).where(eq(items.id, idToDelete))
                              }
                        } else {
                            // Needs to remove more than available. 
                            // Strategy: Remove all free. Keep taken. (Can't delete taken).
                            // Effectively "Total" will be higher than requested, but minimum possible.
                             for (const p of freeParcels) {
                                await tx.delete(items).where(eq(items.id, p.id))
                             }
                        }
                    }
                 }
             }
             
             return await tx.query.lists.findFirst({ where: eq(lists.id, listId)})
        }
    })
  }
}
