import type { Details, Patio } from '../../../shared/domain'
import { OPTIONS } from '../../../shared/domain'
import { Chips, MultiChips, YesNo } from '../../components/Chips'
import { money } from '../../lib/format'
import { optionsOf, SECTIONS, type FieldDef } from './formConfig'

type Patch = (p: Partial<Details>) => void

function PatiosEditor({ patios, onChange }: { patios: Patio[]; onChange: (p: Patio[] | null) => void }) {
  const update = (i: number, p: Partial<Patio>) => onChange(patios.map((x, j) => (j === i ? { ...x, ...p } : x)))
  return (
    <div className="patios">
      {patios.map((p, i) => (
        <div key={i} className="patio">
          <div className="patio-head">
            <strong>Patio {i + 1}</strong>
            <button type="button" className="ghost small" onClick={() => onChange(patios.length > 1 ? patios.filter((_, j) => j !== i) : null)}>
              ✕
            </button>
          </div>
          <Chips options={OPTIONS.patioSurface} value={p.surface} onChange={(surface) => update(i, { surface })} />
          <Chips options={OPTIONS.patioSize} value={p.size} onChange={(size) => update(i, { size })} />
          <input value={p.notes ?? ''} onChange={(e) => update(i, { notes: e.target.value || null })} placeholder="Detalle (ej: con pileta, tiene árbol)" />
        </div>
      ))}
      <button type="button" className="small" onClick={() => onChange([...patios, {}])}>
        + Agregar patio
      </button>
    </div>
  )
}

function Field({ f, d, patch }: { f: FieldDef; d: Details; patch: Patch }) {
  if (f.kind === 'patios') {
    if (!d.hasPatio) return null
    return (
      <div className="field wide">
        <span className="field-label">Patios</span>
        <PatiosEditor patios={d.patios ?? []} onChange={(patios) => patch({ patios })} />
      </div>
    )
  }
  const value = d[f.key] as unknown
  const set = (v: unknown) => patch({ [f.key]: v } as Partial<Details>)
  const label = <span className="field-label">{f.label}</span>

  switch (f.kind) {
    case 'enum':
      return (
        <div className="field wide">
          {label}
          <Chips options={optionsOf(f.options)} value={value as string | null} onChange={set} />
        </div>
      )
    case 'multi':
      return (
        <div className="field wide">
          {label}
          <MultiChips options={optionsOf(f.options)} value={value as string[] | null} onChange={set} />
        </div>
      )
    case 'bool':
      return (
        <div className="field">
          {label}
          <YesNo value={value as boolean | null} onChange={set} />
          {f.hint && <span className="muted small">{f.hint}</span>}
        </div>
      )
    case 'number':
    case 'money': {
      const isMoney = f.kind === 'money'
      return (
        <label className="field">
          {label}
          <div className="input-suffix">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={f.kind === 'number' ? (f.step ?? 1) : 1000}
              value={value == null ? '' : String(value)}
              onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
            />
            {f.kind === 'number' && f.suffix && <span>{f.suffix}</span>}
          </div>
          {isMoney && value != null && <span className="muted small">{d.currency === 'USD' ? `US$ ${value}` : money(value as number)}</span>}
          {isMoney && f.hint && <span className="muted small">{f.hint}</span>}
        </label>
      )
    }
    case 'date':
      return (
        <label className="field">
          {label}
          <input type="date" value={(value as string) ?? ''} onChange={(e) => set(e.target.value || null)} />
        </label>
      )
    case 'text':
      return (
        <label className="field wide">
          {label}
          <textarea rows={2} value={(value as string) ?? ''} placeholder={f.placeholder} onChange={(e) => set(e.target.value || null)} />
        </label>
      )
  }
}

export function DetailsForm({ details, onChange }: { details: Details; onChange: (d: Details) => void }) {
  const patch: Patch = (p) => onChange({ ...details, ...p })
  return (
    <>
      {SECTIONS.map((s) => (
        <fieldset key={s.title} className="card form-section">
          <legend>{s.title}</legend>
          <div className="fields">
            {s.fields.map((f, i) => (
              <Field key={f.kind === 'patios' ? `patios-${i}` : f.key} f={f} d={details} patch={patch} />
            ))}
          </div>
        </fieldset>
      ))}
    </>
  )
}
