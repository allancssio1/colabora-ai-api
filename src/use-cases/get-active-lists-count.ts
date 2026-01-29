import { db } from '@/db/connection'
import { lists } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'

interface GetActiveListsCountInput {
  userId: string
}

interface GetActiveListsCountOutput {
  count: number
}

export class GetActiveListsCountUseCase {
  async execute({
    userId,
  }: GetActiveListsCountInput): Promise<GetActiveListsCountOutput> {
    const result = await db
      .select({ count: count() })
      .from(lists)
      .where(and(eq(lists.user_id, userId), eq(lists.status, 'active')))

    return {
      count: result[0]?.count ?? 0,
    }
  }
}
