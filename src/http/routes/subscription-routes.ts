import { FastifyInstance } from 'fastify'
import { verifyJwt } from '@/http/middlewares/verify-jwt'
import { getSubscriptionStatus } from '@/http/controllers/subscription/get-status'
import { getSubscriptionPlans } from '@/http/controllers/subscription/get-plans'
import { createCheckout } from '@/http/controllers/subscription/create-checkout'
import { getPaymentStatus } from '@/http/controllers/subscription/get-payment-status'
import { handleWebhook } from '@/http/controllers/subscription/webhook'
import {
  createCheckoutBodySchema,
  paymentStatusParamsSchema,
  webhookQuerySchema,
  webhookBodySchema,
} from '@/validations/subscription-schemas'

export async function subscriptionRoutes(app: FastifyInstance) {
  // Rota pública - webhook do Abacate Pay
  app.post(
    '/webhooks/abacate-pay',
    {
      schema: {
        querystring: webhookQuerySchema,
        body: webhookBodySchema,
      },
    },
    handleWebhook,
  )

  // Rota pública - listar planos disponíveis
  app.get('/subscription/plans', getSubscriptionPlans)

  // Rotas protegidas
  app.register(async (protectedApp) => {
    protectedApp.addHook('onRequest', verifyJwt)

    // Status da assinatura do usuário
    protectedApp.get(
      '/subscription/status',
      {
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      },
      getSubscriptionStatus,
    )

    // Criar checkout (gerar QR Code PIX)
    protectedApp.post(
      '/subscription/checkout',
      {
        schema: {
          body: createCheckoutBodySchema,
        },
        config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      },
      createCheckout,
    )

    // Verificar status do pagamento (polling)
    protectedApp.get(
      '/subscription/payment/:transactionId',
      {
        schema: {
          params: paymentStatusParamsSchema,
        },
        config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      },
      getPaymentStatus,
    )
  })
}
