import { optionLabel, type Details, type OptionKey } from '../../../shared/domain'
import { money } from '../../lib/format'
import { SECTIONS, type FieldDef } from '../properties/formConfig'

function display(f: Exclude<FieldDef, { kind: 'patios' }>, d: Details): string | null {
  const v = d[f.key] as unknown
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null
  switch (f.kind) {
    case 'enum':
      return optionLabel(f.options as OptionKey, v as string)
    case 'multi':
      return (v as string[]).map((x) => optionLabel(f.options as OptionKey, x)).join(', ')
    case 'bool':
      return v ? 'Sí' : 'No'
    case 'money':
      return d.currency === 'USD' && !String(f.key).startsWith('est') ? `US$ ${v}` : money(v as number)
    case 'number':
      return `${v}${f.suffix ? ` ${f.suffix}` : ''}`
    case 'date':
      return new Date(`${v}T12:00:00`).toLocaleDateString('es-AR')
    case 'text':
      return String(v)
  }
}

/** Ficha de solo lectura: muestra únicamente lo que se completó. */
export function DetailsView({ details }: { details: Details }) {
  return (
    <>
      {SECTIONS.map((s) => {
        const rows: [string, string][] = []
        for (const f of s.fields) {
          if (f.kind === 'patios') {
            details.patios?.forEach((p, i) => {
              const parts = [
                p.surface && optionLabel('patioSurface', p.surface),
                p.size && optionLabel('patioSize', p.size),
                p.notes,
              ].filter(Boolean)
              if (parts.length) rows.push([`Patio ${i + 1}`, parts.join(' · ')])
            })
            continue
          }
          const value = display(f, details)
          if (value) rows.push([f.label, value])
        }
        if (!rows.length) return null
        return (
          <div key={s.title} className="card">
            <h3>{s.title}</h3>
            <dl className="kv">
              {rows.map(([k, v]) => (
                <div key={k} className="kv-row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </>
  )
}
