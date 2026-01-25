import { env } from '../libs/env'
import { createHmac } from 'crypto'

const ABACATE_PAY_API_URL = 'https://api.abacatepay.com/v1'

interface CreatePixChargeParams {
  amount: number // em centavos
  description: string
  expiresIn?: number // segundos (default: 24h = 86400)
  customer?: {
    name: string
    email: string
    cellphone: string
    taxId: string // CPF
  }
  metadata?: Record<string, string>
}

interface AbacatePayPixResponse {
  id: string
  amount: number
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'
  devMode: boolean
  brCode: string
  brCodeBase64: string
  platformFee: number
  createdAt: string
  updatedAt: string
  expiresAt: string
}

interface AbacatePayError {
  error: string
  message: string
}

export class AbacatePayService {
  private apiKey: string

  constructor() {
    if (!env.ABACATE_PAY_API_KEY) {
      throw new Error('ABACATE_PAY_API_KEY is not configured')
    }
    this.apiKey = env.ABACATE_PAY_API_KEY
  }

  async createPixCharge(
    params: CreatePixChargeParams,
  ): Promise<AbacatePayPixResponse> {
    const response = await fetch(`${ABACATE_PAY_API_URL}/pixQrCode/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        amount: params.amount,
        description: params.description,
        expiresIn: params.expiresIn || 86400, // 24 horas por padrão
        customer: params.customer,
        metadata: params.metadata,
      }),
    })

    if (!response.ok) {
      const error = (await response.json()) as AbacatePayError
      throw new Error(`Abacate Pay error: ${error.message || error.error}`)
    }

    return response.json() as Promise<AbacatePayPixResponse>
  }

  async getChargeStatus(chargeId: string): Promise<AbacatePayPixResponse> {
    const response = await fetch(
      `${ABACATE_PAY_API_URL}/pixQrCode/check?id=${chargeId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    )

    if (!response.ok) {
      const error = (await response.json()) as AbacatePayError
      throw new Error(`Abacate Pay error: ${error.message || error.error}`)
    }

    return response.json() as Promise<AbacatePayPixResponse>
  }

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
