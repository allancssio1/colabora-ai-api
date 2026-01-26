import AbacatePay from 'abacatepay-nodejs-sdk'
import type {
  IPixQrCode,
  CreatePixQrCodeData,
  IBilling,
} from 'abacatepay-nodejs-sdk/dist/types'
import { env } from '../libs/env'
import { createHmac } from 'node:crypto'
import {
  CreatePixChargeParams,
  CustomerPixData,
} from '@/types/abacate-pay-types'

// Inicializa o cliente do SDK
const abacate = AbacatePay(env.ABACATE_PAY_API_KEY)

export class AbacatePayService {
  /**
   * Cria um QR Code PIX para pagamento direto
   */
  async createPixCharge(params: CreatePixChargeParams): Promise<IPixQrCode> {
    for (const key in params) {
      if (!params[key as keyof CreatePixChargeParams]) {
        throw new Error(`Missing required parameter: ${key}`)
      }
      if (params[key as keyof CreatePixChargeParams] === 'customer') {
        for (const customerKey in params.customer) {
          if (!params.customer[customerKey as keyof CustomerPixData]) {
            throw new Error(`Missing required parameter: ${customerKey}`)
          }
        }
      }
    }

    const data: CreatePixQrCodeData = {
      amount: params.amount,
      description: params.description,
      expiresIn: params.expiresIn,
      customer: params.customer
        ? {
            name: params.customer.name,
            email: params.customer.email,
            cellphone: params.customer.cellphone,
            taxId: params.customer.taxId,
          }
        : undefined,
    }

    const response = await abacate.pixQrCode.create(data)

    if (response.error || !('data' in response)) {
      throw new Error(`Abacate Pay error: ${response.error}`)
    }

    return response.data
  }

  /**
   * Verifica o status de um pagamento PIX
   */
  async checkPixStatus(pixId: string): Promise<IPixQrCode> {
    const response = await abacate.pixQrCode.check({ id: pixId })

    if (response.error || !('data' in response)) {
      throw new Error(`Abacate Pay error: ${response.error}`)
    }

    return response.data
  }

  /**
   * Simula pagamento em modo dev
   */
  async simulatePayment(pixId: string): Promise<IPixQrCode> {
    const response = await abacate.pixQrCode.simulatePayment({ id: pixId })

    if (response.error || !('data' in response)) {
      throw new Error(`Abacate Pay error: ${response.error}`)
    }

    return response.data
  }

  /**
   * Lista todos os billings
   */
  async listBillings(): Promise<IBilling[]> {
    const response = await abacate.billing.list()

    if (response.error || !response.data) {
      throw new Error(`Abacate Pay error: ${response.error}`)
    }

    return response.data
  }

  /**
   * Verifica assinatura do webhook
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!env.ABACATE_PAY_WEBHOOK_SECRET) {
      throw new Error('ABACATE_PAY_WEBHOOK_SECRET is not configured')
    }

    const expectedSignature = createHmac(
      'sha256',
      env.ABACATE_PAY_WEBHOOK_SECRET,
    )
      .update(payload)
      .digest('hex')

    return signature === expectedSignature
  }
}

export const abacatePayService = new AbacatePayService()
