import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import type { InboxItem } from '../../../shared/api'
import { detect } from '../../../shared/detect'
import { api } from '../../api'
import { qk } from '../../hooks'
import { relativeDay } from '../../lib/format'
import { whatsappUrl } from '../../lib/links'
import { toast } from '../../lib/toast'
import { NewPropertyDialog } from '../properties/NewPropertyDialog'

export function useInbox() {
  return useQuery({ queryKey: qk.inbox, queryFn: api.inbox })
}

function useInboxMutation<T>(fn: (a: T) => Promise<unknown>, success?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inbox })
      if (success) toast(success)
    },
    onError: (e) => toast.error(e.message),
  })
}

/** Campo para anotar rápido. Se usa en la página y en el botón "Agregar" del celu. */
export function InboxQuickAdd({ onDone, autoFocus }: { onDone?: () => void; autoFocus?: boolean }) {
  const [text, setText] = useState('')
  const add = useInboxMutation((t: string) => api.addInbox(t), 'Pendiente anotado')
  const submit = () => {
    if (!text.trim()) return
    add.mutate(text.trim(), {
      onSuccess: () => {
        setText('')
        onDone?.()
      },
    })
  }
  return (
    <form
      className="inbox-add"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        rows={3}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
        }}
        placeholder="Pegá un número, un link o lo que te pasaron. Ej: 353 415-2233 depto en Bv. España"
      />
      <button className="primary" disabled={!text.trim() || add.isPending}>
        Anotar
      </button>
    </form>
  )
}

function InboxRow({ item, onCreate }: { item: InboxItem; onCreate: (item: InboxItem) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.text)
  const { links, phones } = detect(item.text)
  const update = useInboxMutation((p: { text?: string; done?: boolean }) => api.updateInbox(item.id, p))
  const remove = useInboxMutation(() => api.deleteInbox(item.id), 'Pendiente borrado')

  return (
    <li className={`inbox-item ${item.done ? 'done' : ''}`}>
      {editing ? (
        <div className="inline-edit">
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <div className="row">
            <button
              className="primary small"
              onClick={() => update.mutate({ text: text.trim() }, { onSuccess: () => setEditing(false) })}
              disabled={!text.trim()}
            >
              Guardar
            </button>
            <button className="ghost small" onClick={() => (setText(item.text), setEditing(false))}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="inbox-text" onClick={() => !item.done && setEditing(true)} title={item.done ? undefined : 'Click para editar'}>
          {item.text}
        </p>
      )}

      {(links.length > 0 || phones.length > 0) && (
        <div className="chips">
          {links.map((l) => (
            <a key={l} className="chip" href={l} target="_blank" rel="noreferrer">
              🔗 {new URL(l).hostname.replace(/^www\./, '')}
            </a>
          ))}
          {phones.map((p) => (
            <span key={p} className="row inbox-phone">
              <a className="chip" href={whatsappUrl(p, '')} target="_blank" rel="noreferrer">
                💬 {p}
              </a>
              <a className="chip" href={`tel:${p}`}>
                📞
              </a>
            </span>
          ))}
        </div>
      )}

      <div className="inbox-meta">
        <span className="muted small">{relativeDay(item.createdAt)}</span>
        <span className="spacer" />
        {item.done ? (
          <>
            {item.propertyId && (
              <Link className="small" to={`/p/${item.propertyId}`}>
                Ver alquiler →
              </Link>
            )}
            <button className="ghost small" onClick={() => update.mutate({ done: false })}>
              Reabrir
            </button>
          </>
        ) : (
          <>
            <button className="small primary" onClick={() => onCreate(item)}>
              Crear alquiler
            </button>
            <button className="small" onClick={() => update.mutate({ done: true }, { onSuccess: () => toast('Marcado como resuelto') })}>
              ✓ Resuelto
            </button>
          </>
        )}
        <button className="ghost small danger" onClick={() => confirm('¿Borrar este pendiente?') && remove.mutate(undefined)} title="Borrar">
          🗑
        </button>
      </div>
    </li>
  )
}

export function InboxPage() {
  const qc = useQueryClient()
  const inbox = useInbox()
  const [creating, setCreating] = useState<InboxItem | null>(null)
  const items = inbox.data ?? []
  const pending = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)
  const d = creating ? detect(creating.text) : null

  return (
    <section>
      <div className="page-head">
        <h1>Pendientes</h1>
        <span className="muted small">Lo que te pasaron y todavía no cargaste como alquiler.</span>
      </div>

      <InboxQuickAdd />

      {pending.length === 0 ? (
        <p className="muted">No tenés pendientes. 🎉</p>
      ) : (
        <ul className="inbox-list">
          {pending.map((i) => (
            <InboxRow key={i.id} item={i} onCreate={setCreating} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <details className="inbox-done">
          <summary>Resueltos ({done.length})</summary>
          <ul className="inbox-list">
            {done.map((i) => (
              <InboxRow key={i.id} item={i} onCreate={setCreating} />
            ))}
          </ul>
        </details>
      )}

      {creating && d && (
        <NewPropertyDialog
          initial={{ title: d.title, listingUrl: d.links[0], contactPhone: d.phones[0], description: creating.text }}
          onClose={() => setCreating(null)}
          onCreated={async (propertyId) => {
            // El pendiente queda resuelto y enlazado al alquiler nuevo.
            await api.updateInbox(creating.id, { done: true, propertyId })
            qc.invalidateQueries({ queryKey: qk.inbox })
          }}
        />
      )}
    </section>
  )
}
