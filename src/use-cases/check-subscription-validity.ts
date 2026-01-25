import { db } from '@/db/connection'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { GetUserListsCountUseCase } from './get-user-lists-count'
import { FREE_LIST_LIMIT } from '@/constants/subscription-plans'

interface CheckSubscriptionValidityInput {
  userId: string
}

interface CheckSubscriptionValidityOutput {
  isValid: boolean
  isReadOnly: boolean
  plan: string | null
  expiresAt: Date | null
  status: string | null
}

export class CheckSubscriptionValidityUseCase {
  async execute({
    userId,
  }: CheckSubscriptionValidityInput): Promise<CheckSubscriptionValidityOutput> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return {
        isValid: false,
        isReadOnly: true,
        plan: null,
        expiresAt: null,
        status: null,
      }
    }

    const subscriptionStatus = user.subscription_status || 'none'
    const subscriptionPlan = user.subscription_plan
    const expiresAt = user.subscription_expires_at

    // Sem assinatura (trial)
    if (subscriptionStatus === 'none' || !subscriptionPlan) {
      const getUserListsCount = new GetUserListsCountUseCase()
      const { count } = await getUserListsCount.execute({ userId })

      // Tem menos de 1 lista = pode usar (trial)
      if (count < FREE_LIST_LIMIT) {
        return {
          isValid: true,
          isReadOnly: false,
          plan: null,
          expiresAt: null,
          status: 'none',
        }
      }

      // Já usou o trial
      return {
        isValid: false,
        isReadOnly: true,
        plan: null,
        expiresAt: null,
        status: 'none',
      }
    }

    // Assinatura ativa
    if (subscriptionStatus === 'active') {
      const now = new Date()

      // Verifica se expirou
      if (expiresAt && expiresAt <= now) {
        // Atualizar status para expired
        await db
          .update(users)
          .set({ subscription_status: 'expired' })
          .where(eq(users.id, userId))

        return {
          isValid: false,
          isReadOnly: true,
          plan: subscriptionPlan,
          expiresAt,
          status: 'expired',
        }
      }

      // Assinatura válida
      return {
        isValid: true,
        isReadOnly: false,
        plan: subscriptionPlan,
        expiresAt,
        status: 'active',
      }
    }

    // Assinatura expirada
    if (subscriptionStatus === 'expired') {
      return {
        isValid: false,
        isReadOnly: true,
        plan: subscriptionPlan,
        expiresAt,
        status: 'expired',
      }
    }

    // Status desconhecido
    return {
      isValid: false,
      isReadOnly: true,
      plan: null,
      expiresAt: null,
      status: subscriptionStatus,
    }
  }
}
