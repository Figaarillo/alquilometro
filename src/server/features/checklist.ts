import { asc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { checklistItemInputSchema } from '../../shared/domain'
import { db } from '../db/client'
import { checklistItems } from '../db/schema'

export const checklistRoutes = new Hono()

const columns = {
  id: checklistItems.id,
  text: checklistItems.text,
  category: checklistItems.category,
  position: checklistItems.position,
  active: checklistItems.active,
}

checklistRoutes.get('/', async (c) => {
  const rows = await db.select(columns).from(checklistItems).orderBy(asc(checklistItems.position), asc(checklistItems.createdAt))
  return c.json(rows)
})

checklistRoutes.post('/', async (c) => {
  const input = checklistItemInputSchema.parse(await c.req.json())
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${checklistItems.position}), -1)::int` }).from(checklistItems)
  const [row] = await db
    .insert(checklistItems)
    .values({ ...input, position: input.position ?? max + 1 })
    .returning(columns)
  return c.json(row, 201)
})

checklistRoutes.patch('/:id', async (c) => {
  const input = checklistItemInputSchema.partial().parse(await c.req.json())
  const [row] = await db.update(checklistItems).set(input).where(eq(checklistItems.id, c.req.param('id'))).returning(columns)
  if (!row) return c.json({ error: 'No existe' }, 404)
  return c.json(row)
})

checklistRoutes.delete('/:id', async (c) => {
  await db.delete(checklistItems).where(eq(checklistItems.id, c.req.param('id')))
  return c.body(null, 204)
})
