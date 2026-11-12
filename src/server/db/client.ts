import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) throw new Error('Falta DATABASE_URL (copiá .env.example a .env)')

export const pg = postgres(url, { max: 5, onnotice: () => {} })
export const db = drizzle(pg, { schema })

export async function runMigrations() {
  await migrate(db, { migrationsFolder: './drizzle' })
}
