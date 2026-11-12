import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { mergeSettings, settingsSchema, type Settings } from '../../shared/domain'
import { db } from '../db/client'
import { settings } from '../db/schema'

const KEY = 'app'

export const settingsRoutes = new Hono()

export async function loadSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY))
  return mergeSettings(row?.value as Partial<Settings> | undefined)
}

settingsRoutes.get('/', async (c) => c.json(await loadSettings()))

/** Cuánto ocupa la base (fotos incluidas): sirve para no pasarse del volumen de Railway. */
settingsRoutes.get('/storage', async (c) => {
  const [row] = await db.execute<{ photos: number; photo_bytes: string; db_bytes: string }>(sql`
    select
      (select count(*)::int from property_images) as photos,
      (select coalesce(sum(octet_length(data)), 0)::bigint from property_images) as photo_bytes,
      pg_database_size(current_database())::bigint as db_bytes
  `)
  return c.json({ photos: row.photos, photoBytes: Number(row.photo_bytes), dbBytes: Number(row.db_bytes) })
})

settingsRoutes.put('/', async (c) => {
  const value = settingsSchema.parse(await c.req.json())
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  return c.json(value)
})
