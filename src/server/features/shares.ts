import { randomBytes } from 'node:crypto'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { DEFAULT_SHARE_OPTIONS, guestRatingSchema, shareCreateSchema, sharePatchSchema } from '../../shared/domain'
import { db } from '../db/client'
import { guestRatings, properties, propertyImages, shareLinkProperties, shareLinks } from '../db/schema'
import { loadSettings } from './settings'

const newToken = () => randomBytes(18).toString('base64url')

// ---------------------------------------------------------------------------
// Rutas del dueño (protegidas): crear, listar, editar y revocar links.
// ---------------------------------------------------------------------------
export const sharesRoutes = new Hono()

async function propertyIdsByShare(shareIds: string[]) {
  if (!shareIds.length) return new Map<string, string[]>()
  const rows = await db
    .select({ shareId: shareLinkProperties.shareId, propertyId: shareLinkProperties.propertyId })
    .from(shareLinkProperties)
    .where(inArray(shareLinkProperties.shareId, shareIds))
    .orderBy(asc(shareLinkProperties.position))
  const map = new Map<string, string[]>()
  for (const r of rows) map.set(r.shareId, [...(map.get(r.shareId) ?? []), r.propertyId])
  return map
}

async function setShareProperties(shareId: string, propertyIds: string[]) {
  const unique = [...new Set(propertyIds)]
  await db.transaction(async (tx) => {
    await tx.delete(shareLinkProperties).where(eq(shareLinkProperties.shareId, shareId))
    await tx.insert(shareLinkProperties).values(unique.map((propertyId, position) => ({ shareId, propertyId, position })))
  })
}

sharesRoutes.get('/', async (c) => {
  const rows = await db
    .select({
      id: shareLinks.id,
      token: shareLinks.token,
      name: shareLinks.name,
      showNotes: shareLinks.showNotes,
      showContact: shareLinks.showContact,
      showMyRating: shareLinks.showMyRating,
      showScore: shareLinks.showScore,
      allowRatings: shareLinks.allowRatings,
      revokedAt: shareLinks.revokedAt,
      views: shareLinks.views,
      lastViewedAt: shareLinks.lastViewedAt,
      createdAt: shareLinks.createdAt,
      updatedAt: shareLinks.updatedAt,
      ratingsCount: sql<number>`(select count(*)::int from guest_ratings gr where gr.share_id = "share_links"."id")`,
    })
    .from(shareLinks)
    .orderBy(desc(shareLinks.createdAt))
  const ids = await propertyIdsByShare(rows.map((r) => r.id))
  return c.json(rows.map((r) => ({ ...r, propertyIds: ids.get(r.id) ?? [] })))
})

sharesRoutes.post('/', async (c) => {
  const { name, propertyIds, ...options } = shareCreateSchema.parse(await c.req.json())
  const [row] = await db
    .insert(shareLinks)
    .values({ ...DEFAULT_SHARE_OPTIONS, ...options, name, token: newToken() })
    .returning()
  await setShareProperties(row.id, propertyIds)
  return c.json({ ...row, propertyIds, ratingsCount: 0 }, 201)
})

sharesRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const { propertyIds, revoked, ...rest } = sharePatchSchema.parse(await c.req.json())
  const revokedAt = revoked === undefined ? {} : { revokedAt: revoked ? new Date() : null }
  const [row] = await db
    .update(shareLinks)
    .set({ ...rest, ...revokedAt, updatedAt: new Date() })
    .where(eq(shareLinks.id, id))
    .returning()
  if (!row) return c.json({ error: 'No existe' }, 404)
  if (propertyIds) await setShareProperties(id, propertyIds)
  return c.json({ ok: true })
})

/** Valoraciones de invitados de un alquiler (para verlas en el detalle). */
export async function ratingsForProperty(propertyId: string) {
  return db
    .select({
      id: guestRatings.id,
      shareId: guestRatings.shareId,
      shareName: shareLinks.name,
      propertyId: guestRatings.propertyId,
      guestName: guestRatings.guestName,
      rating: guestRatings.rating,
      comment: guestRatings.comment,
      createdAt: guestRatings.createdAt,
      updatedAt: guestRatings.updatedAt,
    })
    .from(guestRatings)
    .innerJoin(shareLinks, eq(guestRatings.shareId, shareLinks.id))
    .where(eq(guestRatings.propertyId, propertyId))
    .orderBy(desc(guestRatings.updatedAt))
}

// ---------------------------------------------------------------------------
// Rutas públicas (sin login): solo con un token válido y no revocado.
// ---------------------------------------------------------------------------
export const publicRoutes = new Hono()

async function activeShare(token: string) {
  const [share] = await db.select().from(shareLinks).where(eq(shareLinks.token, token))
  return share && !share.revokedAt ? share : null
}

async function isShared(shareId: string, propertyId: string) {
  const [row] = await db
    .select({ id: shareLinkProperties.propertyId })
    .from(shareLinkProperties)
    .where(and(eq(shareLinkProperties.shareId, shareId), eq(shareLinkProperties.propertyId, propertyId)))
  return !!row
}

publicRoutes.get('/shares/:token', async (c) => {
  const share = await activeShare(c.req.param('token'))
  if (!share) return c.json({ error: 'Este link no existe o fue desactivado' }, 404)

  const ids = (await propertyIdsByShare([share.id])).get(share.id) ?? []
  const [props, images, ratings, settings] = await Promise.all([
    ids.length ? db.select().from(properties).where(inArray(properties.id, ids)) : Promise.resolve([]),
    ids.length
      ? db
          .select({ id: propertyImages.id, propertyId: propertyImages.propertyId, caption: propertyImages.caption })
          .from(propertyImages)
          .where(inArray(propertyImages.propertyId, ids))
          .orderBy(asc(propertyImages.position), asc(propertyImages.createdAt))
      : Promise.resolve([]),
    db.select().from(guestRatings).where(eq(guestRatings.shareId, share.id)).orderBy(desc(guestRatings.updatedAt)),
    loadSettings(),
  ])

  await db
    .update(shareLinks)
    .set({ views: sql`${shareLinks.views} + 1`, lastViewedAt: new Date() })
    .where(eq(shareLinks.id, share.id))

  const byId = new Map(props.map((p) => [p.id, p]))
  const result = ids
    .map((id) => byId.get(id))
    .filter((p) => !!p)
    .map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      listingUrl: p.listingUrl,
      // Lo privado solo viaja si lo elegiste al compartir.
      contactName: share.showContact ? p.contactName : null,
      contactPhone: share.showContact ? p.contactPhone : null,
      myRating: share.showMyRating ? p.myRating : null,
      notes: share.showNotes ? p.notes : null,
      details: p.details,
      images: images.filter((i) => i.propertyId === p.id).map(({ id, caption }) => ({ id, caption })),
      ratings: share.allowRatings ? ratings.filter((r) => r.propertyId === p.id) : [],
    }))

  return c.json({
    options: {
      showNotes: share.showNotes,
      showContact: share.showContact,
      showMyRating: share.showMyRating,
      showScore: share.showScore,
      allowRatings: share.allowRatings,
    },
    settings,
    properties: result,
  })
})

publicRoutes.get('/shares/:token/images/:imageId', async (c) => {
  const share = await activeShare(c.req.param('token'))
  if (!share) return c.notFound()
  const [img] = await db
    .select({ mime: propertyImages.mime, data: propertyImages.data, propertyId: propertyImages.propertyId })
    .from(propertyImages)
    .where(eq(propertyImages.id, c.req.param('imageId')))
  if (!img || !(await isShared(share.id, img.propertyId))) return c.notFound()
  return c.body(new Uint8Array(img.data), 200, {
    'Content-Type': img.mime,
    'Cache-Control': 'private, max-age=86400',
  })
})

/** El invitado deja (o actualiza) su valoración: una por nombre y alquiler. */
publicRoutes.post('/shares/:token/ratings', async (c) => {
  const share = await activeShare(c.req.param('token'))
  if (!share || !share.allowRatings) return c.json({ error: 'Este link no permite valoraciones' }, 403)
  const input = guestRatingSchema.parse(await c.req.json())
  if (!(await isShared(share.id, input.propertyId))) return c.json({ error: 'Alquiler no compartido' }, 403)

  const [existing] = await db
    .select({ id: guestRatings.id })
    .from(guestRatings)
    .where(
      and(
        eq(guestRatings.shareId, share.id),
        eq(guestRatings.propertyId, input.propertyId),
        sql`lower(${guestRatings.guestName}) = lower(${input.guestName})`,
      ),
    )
  const values = { rating: input.rating ?? null, comment: input.comment ?? null, updatedAt: new Date() }
  if (existing) {
    await db.update(guestRatings).set(values).where(eq(guestRatings.id, existing.id))
  } else {
    await db.insert(guestRatings).values({ ...values, shareId: share.id, propertyId: input.propertyId, guestName: input.guestName })
  }
  return c.json({ ok: true })
})
