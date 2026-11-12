import { asc, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { inboxInputSchema, inboxPatchSchema } from '../../shared/domain'
import { db } from '../db/client'
import { inboxItems } from '../db/schema'

export const inboxRoutes = new Hono()

inboxRoutes.get('/', async (c) => {
  const rows = await db.select().from(inboxItems).orderBy(asc(inboxItems.done), desc(inboxItems.createdAt))
  return c.json(rows)
})

inboxRoutes.post('/', async (c) => {
  const { text } = inboxInputSchema.parse(await c.req.json())
  const [row] = await db.insert(inboxItems).values({ text }).returning()
  return c.json(row, 201)
})

inboxRoutes.patch('/:id', async (c) => {
  const input = inboxPatchSchema.parse(await c.req.json())
  const [row] = await db
    .update(inboxItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(inboxItems.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'No existe' }, 404)
  return c.json(row)
})

inboxRoutes.delete('/:id', async (c) => {
  await db.delete(inboxItems).where(eq(inboxItems.id, c.req.param('id')))
  return c.body(null, 204)
})
