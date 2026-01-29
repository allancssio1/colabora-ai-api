import { eq, and, count } from 'drizzle-orm'
import { db } from '@/db/connection'
import { lists, users } from '@/db/schema'
import { AppError } from '@/errors/app-error'
import {
  FREE_LIST_LIMIT,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanType,
} from '@/constants/subscription-plans'

interface ToggleListStatusRequest {
  userId: string
  listId: string
}

export class ToggleListStatusUseCase {
  async execute({ userId, listId }: ToggleListStatusRequest) {
    // Buscar lista do usuario
    const list = await db.query.lists.findFirst({
      where: and(eq(lists.id, listId), eq(lists.user_id, userId)),
    })

    if (!list) {
      throw new AppError('Lista nao encontrada', 404)
    }

    // Alternar status
    const newStatus = list.status === 'active' ? 'archived' : 'active'

    // Verificar limite do plano ao reativar lista
    if (newStatus === 'active') {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      })

      if (!user) {
        throw new AppError('Usuario nao encontrado', 404)
      }

      const plan = user.subscription_plan as SubscriptionPlanType | null
      const subscriptionStatus = user.subscription_status || 'none'

      let maxLists = FREE_LIST_LIMIT

      if (subscriptionStatus === 'active' && plan && SUBSCRIPTION_PLANS[plan]) {
        // Verificar se assinatura nao expirou
        const now = new Date()
        if (user.subscription_expires_at && user.subscription_expires_at > now) {
          maxLists = SUBSCRIPTION_PLANS[plan].maxLists
        }
      }

      // Contar apenas listas ATIVAS
      const result = await db
        .select({ count: count() })
        .from(lists)
        .where(and(eq(lists.user_id, userId), eq(lists.status, 'active')))

      const activeCount = result[0]?.count ?? 0

      if (activeCount >= maxLists) {
        const planName = plan ? SUBSCRIPTION_PLANS[plan]?.name || plan : 'Gratuito'
        throw new AppError(
          `Limite de ${maxLists} listas ativas atingido no plano ${planName}. Arquive outra lista ou faça upgrade.`,
          402,
        )
      }
    }

    const [updatedList] = await db
      .update(lists)
      .set({
        status: newStatus,
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(eq(lists.id, listId))
      .returning()

    return { list: updatedList }
  }
}
