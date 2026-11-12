import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { CopyButton } from '../../components/CopyButton'
import { qk } from '../../hooks'
import { fmtDateTime } from '../../lib/format'
import { whatsappUrl } from '../../lib/links'
import { toast } from '../../lib/toast'

export function MessagesPage() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: qk.messages, queryFn: api.messages })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const id = selectedId ?? list.data?.[0]?.id ?? null
  const detail = useQuery({ queryKey: qk.message(id ?? ''), queryFn: () => api.message(id!), enabled: !!id })

  const latest = detail.data?.versions[0]
  const [body, setBody] = useState('')
  const [note, setNote] = useState('')
  const [name, setName] = useState('')
  const [viewing, setViewing] = useState<number | null>(null)

  useEffect(() => {
    setBody(latest?.body ?? '')
    setName(detail.data?.name ?? '')
    setNote('')
    setViewing(null)
  }, [detail.data?.id, latest?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.messages })
    qc.invalidateQueries({ queryKey: ['message'] })
  }
  const onError = (e: Error) => toast.error(e.message)
  const saveVersion = useMutation({ mutationFn: () => api.addVersion(id!, body, note.trim() || null), onSuccess: () => (refresh(), toast('Nueva versión guardada')), onError })
  const rename = useMutation({ mutationFn: () => api.renameMessage(id!, name), onSuccess: refresh, onError })
  const remove = useMutation({
    mutationFn: () => api.deleteMessage(id!),
    onSuccess: () => {
      setSelectedId(null)
      refresh()
    },
    onError,
  })
  const create = useMutation({
    mutationFn: (n: string) => api.createMessage(n, ''),
    onSuccess: (t) => {
      setSelectedId(t.id)
      refresh()
    },
    onError,
  })

  const dirty = !!latest && body !== latest.body

  return (
    <section>
      <div className="page-head">
        <h1>Mensajes</h1>
        <button
          className="primary"
          onClick={() => {
            const n = prompt('Nombre del mensaje (ej: Consulta inicial, Pedir visita)')
            if (n?.trim()) create.mutate(n.trim())
          }}
        >
          + Nuevo mensaje
        </button>
      </div>
      <div className="messages">
        <aside className="message-list">
          {list.data?.map((t) => (
            <button key={t.id} className={`message-item ${t.id === id ? 'on' : ''}`} onClick={() => setSelectedId(t.id)}>
              <strong>{t.name}</strong>
              <span className="muted small">v{t.latestVersion}</span>
              <span className="muted small clamp">{t.latestBody || 'vacío'}</span>
            </button>
          ))}
        </aside>

        {detail.data && (
          <div className="message-editor">
            <div className="row">
              <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== detail.data.name && rename.mutate()} />
              <button className="ghost danger" onClick={() => confirm('¿Borrar el mensaje y todas sus versiones?') && remove.mutate()}>
                Borrar
              </button>
            </div>
            <textarea className="message-body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escribí el mensaje…" />
            <div className="muted small">{body.length} caracteres</div>
            <div className="message-actions">
              <CopyButton text={body} className="primary" />
              <a className="button" href={whatsappUrl(null, body)} target="_blank" rel="noreferrer">
                Abrir en WhatsApp
              </a>
              <span className="spacer" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿Qué cambiaste? (opcional)" disabled={!dirty} />
              <button disabled={!dirty || saveVersion.isPending} onClick={() => saveVersion.mutate()}>
                Guardar como v{(latest?.version ?? 0) + 1}
              </button>
            </div>

            <h3>Versiones</h3>
            <ul className="versions">
              {detail.data.versions.map((v) => (
                <li key={v.id}>
                  <div className="version-head" onClick={() => setViewing(viewing === v.version ? null : v.version)}>
                    <strong>v{v.version}</strong>
                    <span className="muted small">{fmtDateTime(v.createdAt)}</span>
                    {v.note && <span className="small">— {v.note}</span>}
                    <span className="spacer" />
                    <CopyButton text={v.body} className="small" />
                    <button className="small ghost" onClick={(e) => (e.stopPropagation(), setBody(v.body))} title="Cargar en el editor">
                      Usar como base
                    </button>
                  </div>
                  {viewing === v.version && <pre className="version-body">{v.body}</pre>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
