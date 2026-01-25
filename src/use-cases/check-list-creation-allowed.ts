import { db } from '@/db/connection'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GetUserListsCountUseCase } from './get-user-lists-count'
import {
  FREE_LIST_LIMIT,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanType,
} from '@/constants/subscription-plans'

interface CheckListCreationAllowedInput {
  userId: string
}

interface CheckListCreationAllowedOutput {
  allowed: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
}

export class CheckListCreationAllowedUseCase {
  async execute({
    userId,
  }: CheckListCreationAllowedInput): Promise<CheckListCreationAllowedOutput> {
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return {
        allowed: false,
        reason: 'Usuário não encontrado',
        currentCount: 0,
        maxAllowed: 0,
      }
    }

    // Contar listas do usuário
    const getUserListsCount = new GetUserListsCountUseCase()
    const { count: currentCount } = await getUserListsCount.execute({ userId })

    const subscriptionStatus = user.subscription_status || 'none'
    const subscriptionPlan =
      user.subscription_plan as SubscriptionPlanType | null
    const expiresAt = user.subscription_expires_at

    // Sem assinatura ativa
    if (subscriptionStatus !== 'active' || !subscriptionPlan) {
      // Verifica trial
      if (currentCount < FREE_LIST_LIMIT) {
        return {
          allowed: true,
          currentCount,
          maxAllowed: FREE_LIST_LIMIT,
        }
      }

      return {
        allowed: false,
        reason: 'Assine um plano para criar mais listas',
        currentCount,
        maxAllowed: FREE_LIST_LIMIT,
      }
    }

    // Verifica se assinatura expirou
    const now = new Date()
    if (expiresAt && expiresAt <= now) {
      return {
        allowed: false,
        reason: 'Sua assinatura expirou. Renove para criar novas listas',
        currentCount,
        maxAllowed: SUBSCRIPTION_PLANS[subscriptionPlan].maxLists,
      }
    }

    // Assinatura ativa - verifica limite do plano
    const maxAllowed = SUBSCRIPTION_PLANS[subscriptionPlan].maxLists

    if (currentCount < maxAllowed) {
      return {
        allowed: true,
        currentCount,
        maxAllowed,
      }
    }

    return {
      allowed: false,
      reason: `Limite de ${maxAllowed} listas do plano ${SUBSCRIPTION_PLANS[subscriptionPlan].name} atingido`,
      currentCount,
      maxAllowed,
    }
  }
}
