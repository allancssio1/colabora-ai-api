import { db } from '../db/connection'
import { lists, items } from '../db/schema'
import { eq, desc, asc, sql } from 'drizzle-orm'

interface GetUserListsRequest {
  userId: string
}

export class GetUserListsUseCase {
  async execute({ userId }: GetUserListsRequest) {
    // Get all lists for user
    const userLists = await db
      .select({
        id: lists.id,
        location: lists.location,
        event_date: lists.event_date,
        status: lists.status,
      })
      .from(lists)
      .where(eq(lists.user_id, userId))
      .orderBy(desc(lists.created_at))

    return { lists: userLists }
  }
}
