import type {
  ChecklistItem,
  MessageTemplateDetail,
  MessageTemplateSummary,
  MessageVersion,
  PropertyDetail,
  PropertyListItem,
  PropertyRow,
  InboxItem,
  ShareLink,
  SharedView,
  VisitWithProperty,
  Visit,
} from '../shared/api'
import type { CheckState, PropertyInput, Settings, ShareOptions } from '../shared/domain'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const isJson = init?.body && !(init.body instanceof FormData)
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: isJson ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  })
  if (!res.ok) {
    // Sesión vencida en cualquier pantalla: el AuthGate vuelve a mostrar el login.
    if (res.status === 401 && !path.startsWith('/auth') && !path.startsWith('/public')) {
      window.dispatchEvent(new Event('auth:expired'))
    }
    let msg = res.statusText
    try {
      const body = await res.json()
      msg = body.issues?.map((i: { message: string }) => i.message).join(', ') || body.error || msg
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export interface VisitInput {
  propertyId?: string | null
  title?: string | null
  location?: string | null
  scheduledAt: string
  endAt?: string | null
  notes?: string | null
  done?: boolean
}

export interface Me {
  authRequired: boolean
  user: string | null
}

/** /auth/me devuelve 401 cuando falta sesión: eso no es un error, es "mostrar login". */
async function me(): Promise<Me> {
  const res = await fetch('/api/auth/me')
  if (res.status === 401) return { authRequired: true, user: null }
  if (!res.ok) throw new Error('No pude verificar la sesión')
  return res.json()
}

export const api = {
  me,
  login: (username: string, password: string) => req<Me>('/auth/login', json('POST', { username, password })),
  logout: () => req('/auth/logout', { method: 'POST' }),
  properties: () => req<PropertyListItem[]>('/properties'),
  property: (id: string) => req<PropertyDetail>(`/properties/${id}`),
  createProperty: (input: PropertyInput) => req<PropertyRow>('/properties', json('POST', input)),
  updateProperty: (id: string, input: Partial<PropertyInput>) => req<PropertyRow>(`/properties/${id}`, json('PATCH', input)),
  deleteProperty: (id: string) => req<void>(`/properties/${id}`, { method: 'DELETE' }),

  uploadImages: (id: string, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    return req<{ inserted: { id: string; bytes: number }[]; failed: { name: string; reason: string }[]; skipped: number }>(`/properties/${id}/images`, { method: 'POST', body: fd })
  },
  imageUrl: (id: string) => `/api/images/${id}`,
  setCover: (imageId: string) => req(`/images/${imageId}/cover`, { method: 'POST' }),
  deleteImage: (imageId: string) => req<void>(`/images/${imageId}`, { method: 'DELETE' }),

  setCheck: (propertyId: string, itemId: string, state: CheckState, comment: string | null) =>
    req(`/properties/${propertyId}/checks/${itemId}`, json('PUT', { state, comment })),

  visits: () => req<VisitWithProperty[]>('/visits'),
  createVisit: (v: VisitInput) => req<Visit>('/visits', json('POST', v)),
  updateVisit: (id: string, v: Partial<VisitInput>) => req<Visit>(`/visits/${id}`, json('PATCH', v)),
  deleteVisit: (id: string) => req<void>(`/visits/${id}`, { method: 'DELETE' }),

  checklist: () => req<ChecklistItem[]>('/checklist'),
  createChecklistItem: (i: { text: string; category?: string | null }) => req<ChecklistItem>('/checklist', json('POST', i)),
  updateChecklistItem: (id: string, i: Partial<Omit<ChecklistItem, 'id'>>) => req<ChecklistItem>(`/checklist/${id}`, json('PATCH', i)),
  deleteChecklistItem: (id: string) => req<void>(`/checklist/${id}`, { method: 'DELETE' }),

  messages: () => req<MessageTemplateSummary[]>('/messages'),
  message: (id: string) => req<MessageTemplateDetail>(`/messages/${id}`),
  createMessage: (name: string, body: string) => req<{ id: string }>('/messages', json('POST', { name, body })),
  addVersion: (id: string, body: string, note: string | null) => req<MessageVersion>(`/messages/${id}/versions`, json('POST', { body, note })),
  renameMessage: (id: string, name: string) => req(`/messages/${id}`, json('PATCH', { name })),
  deleteMessage: (id: string) => req<void>(`/messages/${id}`, { method: 'DELETE' }),

  settings: () => req<Settings>('/settings'),
  inbox: () => req<InboxItem[]>('/inbox'),
  addInbox: (text: string) => req<InboxItem>('/inbox', json('POST', { text })),
  updateInbox: (id: string, input: { text?: string; done?: boolean; propertyId?: string | null }) =>
    req<InboxItem>(`/inbox/${id}`, json('PATCH', input)),
  deleteInbox: (id: string) => req<void>(`/inbox/${id}`, { method: 'DELETE' }),
  storage: () => req<{ photos: number; photoBytes: number; dbBytes: number }>('/settings/storage'),
  saveSettings: (s: Settings) => req<Settings>('/settings', json('PUT', s)),

  shares: () => req<ShareLink[]>('/shares'),
  createShare: (input: { name: string; propertyIds: string[]; expiresInHours?: number } & Partial<ShareOptions>) => req<ShareLink>('/shares', json('POST', input)),
  updateShare: (id: string, input: Partial<ShareOptions> & { name?: string; propertyIds?: string[]; revoked?: boolean }) =>
    req(`/shares/${id}`, json('PATCH', input)),
  deleteShare: (id: string) => req(`/shares/${id}`, { method: 'DELETE' }),
  shareUrl: (token: string) => `${window.location.origin}/c/${token}`,

  shared: (token: string) => req<SharedView>(`/public/shares/${token}`),
  sharedImageUrl: (token: string, imageId: string) => `/api/public/shares/${token}/images/${imageId}`,
  rateShared: (token: string, input: { propertyId: string; guestName: string; rating: number | null; comment: string | null }) =>
    req(`/public/shares/${token}/ratings`, json('POST', input)),
}
