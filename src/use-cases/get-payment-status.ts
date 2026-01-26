import { db } from '@/db/connection'
import { pixTransactions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { AbacatePayService } from '@/services/abacate-pay.service'
import { AppError } from '@/errors/app-error'
import { ActivateSubscriptionUseCase } from './activate-subscription'

interface GetPaymentStatusInput {
  transactionId: string
}

interface GetPaymentStatusOutput {
  status: string
  paidAt: Date | null
  subscriptionActivated: boolean
}

export class GetPaymentStatusUseCase {
  async execute({
    transactionId,
  }: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    // Buscar transação local
    const pixTransaction = await db.query.pixTransactions.findFirst({
      where: eq(pixTransactions.id, transactionId),
    })

    if (!pixTransaction) {
      throw new AppError('Transação não encontrada', 404)
    }

    // Se já está pago, retornar direto
    if (pixTransaction.status === 'PAID') {
      return {
        status: 'PAID',
        paidAt: pixTransaction.paid_at,
        subscriptionActivated: true,
      }
    }

    // Verificar status no Abacate Pay usando SDK
    const abacatePay = new AbacatePayService()
    const chargeStatus = await abacatePay.checkPixStatus(
      pixTransaction.abacate_pay_id,
    )

    // Atualizar status local se mudou
    if (chargeStatus.status !== pixTransaction.status) {
      await db
        .update(pixTransactions)
        .set({
          status: chargeStatus.status,
          paid_at: chargeStatus.status === 'PAID' ? new Date() : null,
        })
        .where(eq(pixTransactions.id, transactionId))

      // Se pagou, ativar assinatura
      if (chargeStatus.status === 'PAID') {
        const activateSubscription = new ActivateSubscriptionUseCase()
        await activateSubscription.execute({
          subscriptionId: pixTransaction.subscription_id,
        })

        return {
          status: 'PAID',
          paidAt: new Date(),
          subscriptionActivated: true,
        }
      }
    }

    return {
      status: chargeStatus.status,
      paidAt: null,
      subscriptionActivated: false,
    }
  }
}
