import { db } from '@/db/connection'
import { pixTransactions, subscriptions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ActivateSubscriptionUseCase } from './activate-subscription'
import { AppError } from '@/errors/app-error'

interface WebhookPayload {
  id: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'
  paidAt?: string
}

interface ProcessPaymentWebhookInput {
  payload: WebhookPayload
}

interface ProcessPaymentWebhookOutput {
  processed: boolean
  action?: string
}

export class ProcessPaymentWebhookUseCase {
  async execute({
    payload,
  }: ProcessPaymentWebhookInput): Promise<ProcessPaymentWebhookOutput> {
    // Buscar transação PIX pelo ID do Abacate Pay
    const pixTransaction = await db.query.pixTransactions.findFirst({
      where: eq(pixTransactions.abacate_pay_id, payload.id),
    })

    if (!pixTransaction) {
      throw new AppError('Transação não encontrada', 404)
    }

    // Atualizar status da transação
    await db
      .update(pixTransactions)
      .set({
        status: payload.status,
        paid_at: payload.paidAt ? new Date(payload.paidAt) : null,
      })
      .where(eq(pixTransactions.id, pixTransaction.id))

    // Se pagamento confirmado, ativar assinatura
    if (payload.status === 'PAID') {
      const activateSubscription = new ActivateSubscriptionUseCase()
      await activateSubscription.execute({
        subscriptionId: pixTransaction.subscription_id,
      })

      return {
        processed: true,
        action: 'subscription_activated',
      }
    }

    // Se expirado ou cancelado, atualizar subscription
    if (payload.status === 'EXPIRED' || payload.status === 'CANCELLED') {
      await db
        .update(subscriptions)
        .set({
          status: payload.status.toLowerCase(),
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, pixTransaction.subscription_id))

      return {
        processed: true,
        action: `subscription_${payload.status.toLowerCase()}`,
      }
    }

    return {
      processed: true,
      action: 'status_updated',
    }
  }
}
