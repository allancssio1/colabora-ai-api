import { db } from '@/db/connection'
import { users, subscriptions, pixTransactions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { AbacatePayService } from '@/services/abacate-pay.service'
import {
  SUBSCRIPTION_PLANS,
  SubscriptionPlanType,
} from '@/constants/subscription-plans'
import { AppError } from '@/errors/app-error'

interface CreateSubscriptionChargeInput {
  userId: string
  plan: SubscriptionPlanType
}

interface CreateSubscriptionChargeOutput {
  subscriptionId: string
  transactionId: string
  pix: {
    brCode: string
    brCodeBase64: string
    amount: number
    expiresAt: string
  }
}

export class CreateSubscriptionChargeUseCase {
  async execute({
    userId,
    plan,
  }: CreateSubscriptionChargeInput): Promise<CreateSubscriptionChargeOutput> {
    // Buscar usuário
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        auth: true,
      },
    })

    if (!user) {
      throw new AppError('Usuário não encontrado', 404)
    }

    // Verificar se já tem assinatura ativa
    if (user.subscription_status === 'active' && user.subscription_expires_at) {
      const now = new Date()
      if (user?.subscription_expires_at > now) {
        throw new AppError(
          'Você já possui uma assinatura ativa. Aguarde ela expirar para renovar ou mudar de plano',
          400,
        )
      }
    }

    const planData = SUBSCRIPTION_PLANS[plan]

    // Criar registro de subscription pendente
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        user_id: userId,
        plan,
        amount: planData.price,
        status: 'pending',
      })
      .returning()

    // Criar cobrança PIX usando o SDK
    const abacatePay = new AbacatePayService()

    const pixCharge = await abacatePay.createPixCharge({
      amount: planData.price,
      description: `Assinatura ${planData.name} - Colabora-AI`,
      expiresIn: 3600, // 1 hora para pagar
      customer: {
        name: user.name,
        email: user.auth.email,
        taxId: user.cpf ?? '04499730341',
        cellphone: '85989353295',
      },
    })

    // Salvar transação PIX
    const [pixTransaction] = await db
      .insert(pixTransactions)
      .values({
        subscription_id: subscription.id,
        abacate_pay_id: pixCharge.id,
        amount: planData.price,
        status: pixCharge.status,
        br_code: pixCharge.brCode,
        qr_code_base64: pixCharge.brCodeBase64,
        expires_at: new Date(pixCharge.expiresAt),
      })
      .returning()

    return {
      subscriptionId: subscription.id,
      transactionId: pixTransaction.id,
      pix: {
        brCode: pixCharge.brCode,
        brCodeBase64: pixCharge.brCodeBase64,
        amount: planData.price,
        expiresAt: pixCharge.expiresAt,
      },
    }
  }
}
