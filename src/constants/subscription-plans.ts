export const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Básico',
    price: 2000, // R$ 20,00 em centavos
    maxLists: 5,
  },
  intermediate: {
    name: 'Intermediário',
    price: 3500, // R$ 35,00 em centavos
    maxLists: 10,
  },
  max: {
    name: 'Max',
    price: 5000, // R$ 50,00 em centavos
    maxLists: 15,
  },
} as const

export type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS

export const FREE_LIST_LIMIT = 1 // 1 lista grátis sem assinatura

export function getPlanByName(plan: SubscriptionPlanType) {
  return SUBSCRIPTION_PLANS[plan]
}

export function formatPrice(priceInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceInCents / 100)
}
