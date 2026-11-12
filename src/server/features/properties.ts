import { asc, desc, eq, getTableColumns, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { checkInputSchema, propertyInputSchema, propertyPatchSchema } from '../../shared/domain'
import { db } from '../db/client'
import { properties, propertyChecks, propertyImages, visits } from '../db/schema'
import { ImageError, optimizeImage } from '../lib/images'
import { ratingsForProperty } from './shares'

/** Límite del original: el servidor lo achica después. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export const propertiesRoutes = new Hono()

propertiesRoutes.get('/', async (c) => {
  const rows = await db
    .select({
      ...getTableColumns(properties),
      coverImageId: sql<string | null>`(select pi.id from property_images pi where pi.property_id = "properties"."id" order by pi.position, pi.created_at limit 1)`,
      imageCount: sql<number>`(select count(*)::int from property_images pi where pi.property_id = "properties"."id")`,
      nextVisit: sql<string | null>`(select to_char(min(v.scheduled_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from visits v where v.property_id = "properties"."id" and v.done = false and v.scheduled_at >= now() - interval '3 hours')`,
      checksDone: sql<number>`(select count(*)::int from property_checks pc where pc.property_id = "properties"."id" and pc.state <> 'pendiente')`,
    })
    .from(properties)
    .orderBy(desc(properties.updatedAt))
  return c.json(rows)
})

propertiesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [p] = await db.select().from(properties).where(eq(properties.id, id))
  if (!p) return c.json({ error: 'No existe' }, 404)
  const [images, vs, checks, guestRatings] = await Promise.all([
    db
      .select({
        id: propertyImages.id,
        propertyId: propertyImages.propertyId,
        mime: propertyImages.mime,
        caption: propertyImages.caption,
        position: propertyImages.position,
        createdAt: propertyImages.createdAt,
      })
      .from(propertyImages)
      .where(eq(propertyImages.propertyId, id))
      .orderBy(asc(propertyImages.position), asc(propertyImages.createdAt)),
    db.select().from(visits).where(eq(visits.propertyId, id)).orderBy(asc(visits.scheduledAt)),
    db
      .select({ itemId: propertyChecks.itemId, state: propertyChecks.state, comment: propertyChecks.comment })
      .from(propertyChecks)
      .where(eq(propertyChecks.propertyId, id)),
    ratingsForProperty(id),
  ])
  return c.json({ ...p, images, visits: vs, checks, guestRatings })
})

propertiesRoutes.post('/', async (c) => {
  const input = propertyInputSchema.parse(await c.req.json())
  const [row] = await db
    .insert(properties)
    .values({ ...input, details: input.details ?? {} })
    .returning()
  return c.json(row, 201)
})

propertiesRoutes.patch('/:id', async (c) => {
  const input = propertyPatchSchema.parse(await c.req.json())
  const [row] = await db
    .update(properties)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(properties.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'No existe' }, 404)
  return c.json(row)
})

propertiesRoutes.delete('/:id', async (c) => {
  await db.delete(properties).where(eq(properties.id, c.req.param('id')))
  return c.body(null, 204)
})

propertiesRoutes.post('/:id/images', async (c) => {
  const propertyId = c.req.param('id')
  const body = await c.req.parseBody({ all: true })
  const raw = body['files']
  const files = (Array.isArray(raw) ? raw : [raw]).filter((f): f is File => f instanceof File)
  if (!files.length) return c.json({ error: 'No llegó ninguna foto' }, 400)

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${propertyImages.position}), -1)::int` })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, propertyId))

  const inserted: { id: string; bytes: number }[] = []
  const failed: { name: string; reason: string }[] = []
  for (const f of files) {
    // No confiamos en f.type: algunos celulares lo mandan vacío. sharp decide si es imagen.
    if (f.size > MAX_UPLOAD_BYTES) {
      failed.push({ name: f.name, reason: `pesa ${(f.size / 1024 / 1024).toFixed(0)} MB (máx. 25 MB)` })
      continue
    }
    try {
      const { data, mime } = await optimizeImage(Buffer.from(await f.arrayBuffer()), f.name)
      const [row] = await db
        .insert(propertyImages)
        .values({ propertyId, mime, data, position: max + 1 + inserted.length })
        .returning({ id: propertyImages.id })
      inserted.push({ id: row.id, bytes: data.length })
    } catch (err) {
      if (!(err instanceof ImageError)) console.error('Error procesando foto', f.name, err)
      failed.push({ name: f.name, reason: err instanceof ImageError ? err.message : 'error al procesarla' })
    }
  }

  if (!inserted.length) {
    return c.json({ error: `No se pudo subir: ${failed.map((x) => `${x.name} (${x.reason})`).join('; ')}`, failed }, 415)
  }
  await db.update(properties).set({ updatedAt: new Date() }).where(eq(properties.id, propertyId))
  return c.json({ inserted, failed, skipped: failed.length }, 201)
})

propertiesRoutes.put('/:id/checks/:itemId', async (c) => {
  const { state, comment } = checkInputSchema.parse(await c.req.json())
  const propertyId = c.req.param('id')
  const itemId = c.req.param('itemId')
  await db
    .insert(propertyChecks)
    .values({ propertyId, itemId, state, comment, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [propertyChecks.propertyId, propertyChecks.itemId],
      set: { state, comment, updatedAt: new Date() },
    })
  return c.json({ ok: true })
})
