import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../db/client'
import { propertyImages } from '../db/schema'

export const imagesRoutes = new Hono()

imagesRoutes.get('/:id', async (c) => {
  const [img] = await db
    .select({ mime: propertyImages.mime, data: propertyImages.data })
    .from(propertyImages)
    .where(eq(propertyImages.id, c.req.param('id')))
  if (!img) return c.notFound()
  return c.body(new Uint8Array(img.data), 200, {
    'Content-Type': img.mime,
    'Cache-Control': 'private, max-age=31536000, immutable',
  })
})

imagesRoutes.patch('/:id', async (c) => {
  const { caption } = z.object({ caption: z.string().max(500).nullish() }).parse(await c.req.json())
  await db.update(propertyImages).set({ caption }).where(eq(propertyImages.id, c.req.param('id')))
  return c.json({ ok: true })
})

/** Portada = la de menor posición. */
imagesRoutes.post('/:id/cover', async (c) => {
  const id = c.req.param('id')
  const [img] = await db.select({ propertyId: propertyImages.propertyId }).from(propertyImages).where(eq(propertyImages.id, id))
  if (!img) return c.notFound()
  const [{ min }] = await db
    .select({ min: sql<number>`coalesce(min(${propertyImages.position}), 0)::int` })
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, img.propertyId))
  await db.update(propertyImages).set({ position: min - 1 }).where(eq(propertyImages.id, id))
  return c.json({ ok: true })
})

imagesRoutes.delete('/:id', async (c) => {
  await db.delete(propertyImages).where(eq(propertyImages.id, c.req.param('id')))
  return c.body(null, 204)
})
