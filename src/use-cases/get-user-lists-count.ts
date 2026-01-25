import { db } from '@/db/connection'
import { lists } from '@/db/schema'
import { eq, count } from 'drizzle-orm'

interface GetUserListsCountInput {
  userId: string
}

interface GetUserListsCountOutput {
  count: number
}

export class GetUserListsCountUseCase {
  async execute({
    userId,
  }: GetUserListsCountInput): Promise<GetUserListsCountOutput> {
    const result = await db
      .select({ count: count() })
      .from(lists)
      .where(eq(lists.user_id, userId))

    return {
      count: result[0]?.count ?? 0,
    }
  }
}
