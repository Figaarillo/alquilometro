import { eq } from 'drizzle-orm'
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

settingsRoutes.put('/', async (c) => {
  const value = settingsSchema.parse(await c.req.json())
  await db.insert(settings).values({ key: KEY, value }).onConflictDoUpdate({ target: settings.key, set: { value } })
  return c.json(value)
})
