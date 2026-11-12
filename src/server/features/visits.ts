import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { visitInputSchema, visitPatchSchema } from '../../shared/domain'
import { db } from '../db/client'
import { properties, visits } from '../db/schema'

export const visitsRoutes = new Hono()

visitsRoutes.get('/', async (c) => {
  const rows = await db
    .select({
      ...getTableColumns(visits),
      propertyTitle: properties.title,
      propertyAddress: properties.address,
      lat: properties.lat,
      lng: properties.lng,
    })
    .from(visits)
    .leftJoin(properties, eq(visits.propertyId, properties.id))
    .orderBy(asc(visits.scheduledAt))
  return c.json(rows)
})

visitsRoutes.post('/', async (c) => {
  const input = visitInputSchema.parse(await c.req.json())
  const [row] = await db.insert(visits).values(input).returning()
  // Agendar una visita mueve la propiedad en el tablero de procesos.
  if (input.propertyId) {
    await db
      .update(properties)
      .set({ status: 'visita_agendada', updatedAt: new Date() })
      .where(and(eq(properties.id, input.propertyId), inArray(properties.status, ['nuevo', 'contactado'])))
  }
  return c.json(row, 201)
})

visitsRoutes.patch('/:id', async (c) => {
  const input = visitPatchSchema.parse(await c.req.json())
  const [row] = await db.update(visits).set(input).where(eq(visits.id, c.req.param('id'))).returning()
  if (!row) return c.json({ error: 'No existe' }, 404)
  if (input.done && row.propertyId) {
    await db
      .update(properties)
      .set({ status: 'visitado', updatedAt: new Date() })
      .where(and(eq(properties.id, row.propertyId), eq(properties.status, 'visita_agendada')))
  }
  return c.json(row)
})

visitsRoutes.delete('/:id', async (c) => {
  await db.delete(visits).where(eq(visits.id, c.req.param('id')))
  return c.body(null, 204)
})
