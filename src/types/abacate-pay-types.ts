export interface CustomerPixData {
  name: string
  email: string
  cellphone?: string
  taxId?: string // CPF
}

export interface CreatePixChargeParams {
  amount: number // em centavos
  description: string
  expiresIn: number // segundos
  customer?: CustomerPixData
}
