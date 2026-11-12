import { useState } from 'react'
import type { ChecklistItem } from '../../../shared/api'
import { api } from '../../api'
import { useAppMutation, useChecklist, useInvalidateAll } from '../../hooks'
import { useQueryClient } from '@tanstack/react-query'
import { qk } from '../../hooks'

export function groupByCategory(items: ChecklistItem[]) {
  const map = new Map<string, ChecklistItem[]>()
  for (const i of items) {
    const k = i.category || 'General'
    map.set(k, [...(map.get(k) ?? []), i])
  }
  return [...map.entries()]
}

function useChecklistMutation<T>(fn: (a: T) => Promise<unknown>) {
  const qc = useQueryClient()
  const invalidate = useInvalidateAll()
  return useAppMutation(fn, () => {
    qc.invalidateQueries({ queryKey: qk.checklist })
    invalidate()
  })
}

export function useAddChecklistItem() {
  return useChecklistMutation(api.createChecklistItem)
}

function ItemRow({ item, prev, next }: { item: ChecklistItem; prev?: ChecklistItem; next?: ChecklistItem }) {
  const [text, setText] = useState(item.text)
  const [category, setCategory] = useState(item.category ?? '')
  const update = useChecklistMutation((p: Partial<ChecklistItem>) => api.updateChecklistItem(item.id, p))
  const remove = useChecklistMutation(() => api.deleteChecklistItem(item.id))
  const swap = useChecklistMutation(async (other: ChecklistItem) => {
    await api.updateChecklistItem(item.id, { position: other.position })
    await api.updateChecklistItem(other.id, { position: item.position })
  })

  return (
    <li className={`check-admin ${item.active ? '' : 'inactive'}`}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text.trim() && text !== item.text && update.mutate({ text: text.trim() })}
      />
      <input
        className="category-input"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onBlur={() => category !== (item.category ?? '') && update.mutate({ category: category.trim() || null })}
        placeholder="Categoría"
      />
      <button className="ghost small" disabled={!prev} onClick={() => prev && swap.mutate(prev)} title="Subir">
        ↑
      </button>
      <button className="ghost small" disabled={!next} onClick={() => next && swap.mutate(next)} title="Bajar">
        ↓
      </button>
      <label className="small toggle">
        <input type="checkbox" checked={item.active} onChange={(e) => update.mutate({ active: e.target.checked })} /> activo
      </label>
      <button className="ghost small danger" onClick={() => confirm('¿Borrar este ítem?') && remove.mutate(undefined)}>
        🗑
      </button>
    </li>
  )
}

export function ChecklistPage() {
  const items = useChecklist()
  const add = useAddChecklistItem()
  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const all = items.data ?? []
  const categories = [...new Set(all.map((i) => i.category).filter(Boolean))] as string[]

  return (
    <section>
      <div className="page-head">
        <h1>Checklist de visita</h1>
        <span className="muted small">Lo que no se te puede pasar. Aparece en cada alquiler para ir tildando.</span>
      </div>
      <form
        className="row add-item"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          add.mutate({ text: text.trim(), category: category.trim() || null })
          setText('')
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nuevo ítem, ej: ¿Hay lugar para bicicleta?" />
        <input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría" className="category-input" />
        <datalist id="categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <button className="primary">Agregar</button>
      </form>
      {groupByCategory(all).map(([cat, list]) => (
        <div key={cat} className="card">
          <h3>{cat}</h3>
          <ul className="plain">
            {list.map((i, idx) => (
              <ItemRow key={i.id} item={i} prev={list[idx - 1]} next={list[idx + 1]} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
