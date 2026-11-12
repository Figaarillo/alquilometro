import { desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { messageCreateSchema, messageVersionSchema } from '../../shared/domain'
import { db } from '../db/client'
import { messageTemplates, messageVersions } from '../db/schema'

export const messagesRoutes = new Hono()

messagesRoutes.get('/', async (c) => {
  const rows = await db
    .select({
      id: messageTemplates.id,
      name: messageTemplates.name,
      updatedAt: messageTemplates.updatedAt,
      latestVersion: sql<number>`coalesce((select max(v.version) from message_versions v where v.template_id = "message_templates"."id"), 0)::int`,
      latestBody: sql<string>`coalesce((select v.body from message_versions v where v.template_id = "message_templates"."id" order by v.version desc limit 1), '')`,
    })
    .from(messageTemplates)
    .orderBy(desc(messageTemplates.updatedAt))
  return c.json(rows)
})

messagesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [t] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id))
  if (!t) return c.json({ error: 'No existe' }, 404)
  const versions = await db
    .select()
    .from(messageVersions)
    .where(eq(messageVersions.templateId, id))
    .orderBy(desc(messageVersions.version))
  return c.json({ ...t, versions })
})

messagesRoutes.post('/', async (c) => {
  const { name, body } = messageCreateSchema.parse(await c.req.json())
  const t = await db.transaction(async (tx) => {
    const [t] = await tx.insert(messageTemplates).values({ name }).returning()
    await tx.insert(messageVersions).values({ templateId: t.id, version: 1, body, note: 'Versión inicial' })
    return t
  })
  return c.json(t, 201)
})

messagesRoutes.post('/:id/versions', async (c) => {
  const templateId = c.req.param('id')
  const { body, note } = messageVersionSchema.parse(await c.req.json())
  const row = await db.transaction(async (tx) => {
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${messageVersions.version}), 0)::int` })
      .from(messageVersions)
      .where(eq(messageVersions.templateId, templateId))
    const [row] = await tx.insert(messageVersions).values({ templateId, version: max + 1, body, note }).returning()
    await tx.update(messageTemplates).set({ updatedAt: new Date() }).where(eq(messageTemplates.id, templateId))
    return row
  })
  return c.json(row, 201)
})

messagesRoutes.patch('/:id', async (c) => {
  const { name } = z.object({ name: z.string().trim().min(1).max(200) }).parse(await c.req.json())
  await db.update(messageTemplates).set({ name, updatedAt: new Date() }).where(eq(messageTemplates.id, c.req.param('id')))
  return c.json({ ok: true })
})

messagesRoutes.delete('/:id', async (c) => {
  await db.delete(messageTemplates).where(eq(messageTemplates.id, c.req.param('id')))
  return c.body(null, 204)
})
