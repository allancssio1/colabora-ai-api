import 'dotenv/config'
import { env } from './src/libs/env'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  connectionString: env.DATABASE_URL,
}
