import { db } from '../db/connection'
import { items, lists } from '../db/schema'

interface CreateListRequest {
  userId: string
  location: string
  description?: string
  event_date: Date
  items: {
    item_name: string
    quantity_total: number
    unit_type: string
    quantity_per_portion: number
  }[]
}

export class CreateListUseCase {
  async execute({ userId, location, description, event_date, items: inputItems }: CreateListRequest) {
    const result = await db.transaction(async (tx) => {
      const [newList] = await tx
        .insert(lists)
        .values({
          location,
          description,
          event_date,
          user_id: userId,
          status: 'active',
        })
        .returning()

      // Process items
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
            
            // Batch insert for performance
            await tx.insert(items).values(itemsToInsert)
        }
      }

      return newList
    })

    return { list: result }
  }
}
