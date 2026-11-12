import type { CheckState, Details, Status } from './domain'

export interface PropertyRow {
  id: string
  title: string
  status: Status
  description: string | null
  address: string | null
  lat: number | null
  lng: number | null
  listingUrl: string | null
  contactName: string | null
  contactPhone: string | null
  myRating: number | null
  notes: string | null
  details: Details
  createdAt: string
  updatedAt: string
}

export interface PropertyListItem extends PropertyRow {
  coverImageId: string | null
  imageCount: number
  nextVisit: string | null
  checksDone: number
}

export interface ImageMeta {
  id: string
  propertyId: string
  mime: string
  caption: string | null
  position: number
  createdAt: string
}

export interface Visit {
  id: string
  propertyId: string | null
  title: string | null
  location: string | null
  scheduledAt: string
  endAt: string | null
  done: boolean
  notes: string | null
  createdAt: string
}

export interface VisitWithProperty extends Visit {
  propertyTitle: string | null
  propertyAddress: string | null
  lat: number | null
  lng: number | null
}

export interface PropertyDetail extends PropertyRow {
  images: ImageMeta[]
  visits: Visit[]
  checks: PropertyCheck[]
  guestRatings: GuestRating[]
}

export interface ChecklistItem {
  id: string
  text: string
  category: string | null
  position: number
  active: boolean
}

export interface PropertyCheck {
  itemId: string
  state: CheckState
  comment: string | null
}

export interface MessageTemplateSummary {
  id: string
  name: string
  updatedAt: string
  latestVersion: number
  latestBody: string
}

export interface MessageVersion {
  id: string
  templateId: string
  version: number
  body: string
  note: string | null
  createdAt: string
}

export interface MessageTemplateDetail {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  versions: MessageVersion[]
}

export interface ShareLink {
  id: string
  token: string
  name: string
  showNotes: boolean
  showContact: boolean
  showMyRating: boolean
  showScore: boolean
  allowRatings: boolean
  revokedAt: string | null
  views: number
  lastViewedAt: string | null
  createdAt: string
  updatedAt: string
  propertyIds: string[]
  ratingsCount: number
}

export interface GuestRating {
  id: string
  shareId: string
  shareName?: string
  propertyId: string
  guestName: string
  rating: number | null
  comment: string | null
  createdAt: string
  updatedAt: string
}

/** Lo que ve un invitado: datos sin lo privado que no elegiste mostrar. */
export interface SharedProperty {
  id: string
  title: string
  description: string | null
  address: string | null
  lat: number | null
  lng: number | null
  listingUrl: string | null
  contactName: string | null
  contactPhone: string | null
  myRating: number | null
  notes: string | null
  details: import('./domain').Details
  images: { id: string; caption: string | null }[]
  ratings: GuestRating[]
}

export interface SharedView {
  options: import('./domain').ShareOptions
  settings: import('./domain').Settings
  properties: SharedProperty[]
}
