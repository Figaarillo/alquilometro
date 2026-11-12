import { useState } from 'react'
import type { ChecklistItem, PropertyCheck } from '../../../shared/api'
import { CHECK_STATES, type CheckState } from '../../../shared/domain'
import { api } from '../../api'
import { useAppMutation, useChecklist } from '../../hooks'
import { groupByCategory, useAddChecklistItem } from '../checklist/ChecklistPage'

function CheckRow({ propertyId, item, check }: { propertyId: string; item: ChecklistItem; check?: PropertyCheck }) {
  const state: CheckState = check?.state ?? 'pendiente'
  const [comment, setComment] = useState(check?.comment ?? '')
  const save = useAppMutation((p: { state: CheckState; comment: string | null }) => api.setCheck(propertyId, item.id, p.state, p.comment))

  return (
    <li className={`check check-${state}`}>
      <div className="check-text">{item.text}</div>
      <div className="chips">
        {CHECK_STATES.map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`chip ${state === k ? 'on' : ''} chip-${k}`}
            onClick={() => save.mutate({ state: k, comment: comment.trim() || null })}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        className="check-comment"
        value={comment}
        placeholder="Comentario…"
        onChange={(e) => setComment(e.target.value)}
        onBlur={() => comment !== (check?.comment ?? '') && save.mutate({ state, comment: comment.trim() || null })}
      />
    </li>
  )
}

export function ChecklistPanel({ propertyId, checks }: { propertyId: string; checks: PropertyCheck[] }) {
  const items = useChecklist()
  const add = useAddChecklistItem()
  const [text, setText] = useState('')
  const active = (items.data ?? []).filter((i) => i.active)
  const byItem = new Map(checks.map((c) => [c.itemId, c]))
  const done = active.filter((i) => (byItem.get(i.id)?.state ?? 'pendiente') !== 'pendiente').length
  const problems = active.filter((i) => byItem.get(i.id)?.state === 'problema')

  return (
    <div>
      <div className="page-head">
        <h2>
          Checklist {done}/{active.length}
        </h2>
        {problems.length > 0 && <span className="alert alert-danger">{problems.length} problema(s)</span>}
      </div>
      <form
        className="row add-item"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) add.mutate({ text: text.trim(), category: 'Agregados en visitas' })
          setText('')
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Se te ocurrió algo más para revisar? Se suma al checklist general" />
        <button>Agregar</button>
      </form>
      {groupByCategory(active).map(([cat, list]) => (
        <div key={cat} className="card">
          <h3>{cat}</h3>
          <ul className="plain">
            {list.map((i) => (
              <CheckRow key={i.id} propertyId={propertyId} item={i} check={byItem.get(i.id)} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
