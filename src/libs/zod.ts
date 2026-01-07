import { z } from 'zod'

// Custom error map or configurations can go here
// For now, we export z to be used centrally
export { z }

export class ZodError extends Error {
  constructor(public validation: z.ZodError) {
    super('Validation Error')
    this.name = 'ZodError'
  }
}
