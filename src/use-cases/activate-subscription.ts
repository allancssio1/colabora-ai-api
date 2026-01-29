import { db } from '@/db/connection'
import { users, subscriptions, lists } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { AppError } from '@/errors/app-error'
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanType,
} from '@/constants/subscription-plans'

interface ActivateSubscriptionInput {
  subscriptionId: string
}

interface ActivateSubscriptionOutput {
  userId: string
  plan: string
  expiresAt: Date
}

export class ActivateSubscriptionUseCase {
  async execute({
    subscriptionId,
  }: ActivateSubscriptionInput): Promise<ActivateSubscriptionOutput> {
    // Buscar subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, subscriptionId),
    })

    if (!subscription) {
      throw new AppError('Assinatura não encontrada', 404)
    }

    if (subscription.status === 'paid') {
      throw new AppError('Assinatura já está ativa', 400)
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 dias

    // Buscar usuario para verificar plano atual
    const user = await db.query.users.findFirst({
      where: eq(users.id, subscription.user_id),
    })

    if (!user) {
      throw new AppError('Usuário não encontrado', 404)
    }

    // Detectar downgrade e arquivar todas as listas
    const oldPlan = user.subscription_plan as SubscriptionPlanType | null
    const newPlan = subscription.plan as SubscriptionPlanType

    if (oldPlan && SUBSCRIPTION_PLANS[oldPlan] && SUBSCRIPTION_PLANS[newPlan]) {
      const oldMaxLists = SUBSCRIPTION_PLANS[oldPlan].maxLists
      const newMaxLists = SUBSCRIPTION_PLANS[newPlan].maxLists

      if (newMaxLists < oldMaxLists) {
        // Downgrade detectado - arquivar TODAS as listas ativas
        await db
          .update(lists)
          .set({ status: 'archived', updated_at: now })
          .where(
            and(
              eq(lists.user_id, user.id),
              eq(lists.status, 'active'),
            ),
          )
      }
    }

    // Atualizar subscription
    await db
      .update(subscriptions)
      .set({
        status: 'paid',
        starts_at: now,
        expires_at: expiresAt,
        updated_at: now,
      })
      .where(eq(subscriptions.id, subscriptionId))

    // Atualizar usuário
    await db
      .update(users)
      .set({
        subscription_plan: subscription.plan,
        subscription_expires_at: expiresAt,
        subscription_status: 'active',
      })
      .where(eq(users.id, subscription.user_id))

    return {
      userId: subscription.user_id,
      plan: subscription.plan,
      expiresAt,
    }
  }
}
