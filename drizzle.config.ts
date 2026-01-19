import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import { env } from './src/libs/env'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
