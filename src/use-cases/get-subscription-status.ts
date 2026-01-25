import { db } from '@/db/connection'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GetUserListsCountUseCase } from './get-user-lists-count'
import {
  FREE_LIST_LIMIT,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanType,
} from '@/constants/subscription-plans'

interface GetSubscriptionStatusInput {
  userId: string
}

interface GetSubscriptionStatusOutput {
  plan: string | null
  planName: string | null
  status: string
  expiresAt: Date | null
  listsCount: number
  listsLimit: number
  canCreateList: boolean
}

export class GetSubscriptionStatusUseCase {
  async execute({
    userId,
  }: GetSubscriptionStatusInput): Promise<GetSubscriptionStatusOutput> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    const getUserListsCount = new GetUserListsCountUseCase()
    const { count: listsCount } = await getUserListsCount.execute({ userId })

    const subscriptionStatus = user.subscription_status || 'none'
    const subscriptionPlan =
      user.subscription_plan as SubscriptionPlanType | null
    const expiresAt = user.subscription_expires_at

    // Sem assinatura
    if (subscriptionStatus === 'none' || !subscriptionPlan) {
      return {
        plan: null,
        planName: null,
        status: 'none',
        expiresAt: null,
        listsCount,
        listsLimit: FREE_LIST_LIMIT,
        canCreateList: listsCount < FREE_LIST_LIMIT,
      }
    }

    const planData = SUBSCRIPTION_PLANS[subscriptionPlan]

    // Verifica se expirou
    const now = new Date()
    const isExpired = expiresAt && expiresAt <= now

    if (isExpired || subscriptionStatus === 'expired') {
      return {
        plan: subscriptionPlan,
        planName: planData.name,
        status: 'expired',
        expiresAt,
        listsCount,
        listsLimit: planData.maxLists,
        canCreateList: false,
      }
    }

    // Assinatura ativa
    return {
      plan: subscriptionPlan,
      planName: planData.name,
      status: 'active',
      expiresAt,
      listsCount,
      listsLimit: planData.maxLists,
      canCreateList: listsCount < planData.maxLists,
    }
  }
}
