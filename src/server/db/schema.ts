import { boolean, customType, doublePrecision, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { Details } from '../../shared/domain'

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
})

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: text('status').notNull().default('nuevo'),
  description: text('description'),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  listingUrl: text('listing_url'),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  myRating: integer('my_rating'),
  notes: text('notes'),
  details: jsonb('details').$type<Details>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Las imágenes viven en la base: un solo lugar para backupear, sin volúmenes en Railway. */
export const propertyImages = pgTable(
  'property_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    mime: text('mime').notNull(),
    data: bytea('data').notNull(),
    caption: text('caption'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('property_images_property_idx').on(t.propertyId)],
)

export const visits = pgTable(
  'visits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }),
    title: text('title'),
    location: text('location'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }),
    done: boolean('done').notNull().default(false),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('visits_scheduled_idx').on(t.scheduledAt)],
)

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  category: text('category'),
  position: integer('position').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
})

export const propertyChecks = pgTable(
  'property_checks',
  {
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => checklistItems.id, { onDelete: 'cascade' }),
    state: text('state').notNull().default('pendiente'),
    comment: text('comment'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.propertyId, t.itemId] })],
)

export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const messageVersions = pgTable(
  'message_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => messageTemplates.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    body: text('body').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('message_versions_template_idx').on(t.templateId)],
)

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
})

// ---- Compartir (solo lectura, link con token) ----

export const shareLinks = pgTable('share_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Token secreto que va en la URL: quien lo tiene, ve. */
  token: text('token').notNull().unique(),
  name: text('name').notNull(),
  showNotes: boolean('show_notes').notNull().default(false),
  showContact: boolean('show_contact').notNull().default(false),
  showMyRating: boolean('show_my_rating').notNull().default(false),
  showScore: boolean('show_score').notNull().default(true),
  allowRatings: boolean('allow_ratings').notNull().default(true),
  /** Revocar en vez de borrar: no se pierde nada (ni las valoraciones recibidas). */
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  views: integer('views').notNull().default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const shareLinkProperties = pgTable(
  'share_link_properties',
  {
    shareId: uuid('share_id')
      .notNull()
      .references(() => shareLinks.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.shareId, t.propertyId] })],
)

/** Valoración opcional que deja un invitado (sin cuenta, solo con su nombre). */
export const guestRatings = pgTable(
  'guest_ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shareId: uuid('share_id')
      .notNull()
      .references(() => shareLinks.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    guestName: text('guest_name').notNull(),
    rating: integer('rating'),
    comment: text('comment'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('guest_ratings_property_idx').on(t.propertyId)],
)
