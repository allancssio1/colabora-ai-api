import { db } from '@/db/connection'
import { users, subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { AppError } from '@/errors/app-error'

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
