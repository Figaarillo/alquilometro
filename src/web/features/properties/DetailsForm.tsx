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
  if (f.kind === 'size') {
    return (
      <div className="field wide">
        <span className="field-label">Tamaño</span>
        <div className="size-field">
          <Chips options={OPTIONS.sizeCategory} value={d.sizeCategory} onChange={(sizeCategory) => patch({ sizeCategory })} />
          <div className="input-suffix size-m2">
            <span className="muted small">o</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="m²"
              value={d.areaM2 ?? ''}
              onChange={(e) => patch({ areaM2: e.target.value === '' ? null : Number(e.target.value) })}
            />
            <span>m²</span>
          </div>
        </div>
        <span className="muted small">Casi nunca lo publican: si no sabés los m², elegí a ojo. Si cargás los m², mandan esos.</span>
      </div>
    )
  }
  if (f.kind === 'negflag') {
    const on = d[f.key] === false
    return (
      <div className="field">
        <span className="field-label">Condición</span>
        <label className="switch-row neg-flag">
          <input type="checkbox" checked={on} onChange={(e) => patch({ [f.key]: e.target.checked ? false : null } as Partial<Details>)} />
          <span>{f.label}</span>
        </label>
        {f.hint && <span className="muted small">{f.hint}</span>}
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

export function DetailsForm({
  details,
  onChange,
  only,
  exclude,
}: {
  details: Details
  onChange: (d: Details) => void
  /** Títulos de secciones a mostrar (para ubicarlas en otro lugar de la pantalla). */
  only?: string[]
  exclude?: string[]
}) {
  const patch: Patch = (p) => onChange({ ...details, ...p })
  return (
    <>
      {SECTIONS.filter((s) => (!only || only.includes(s.title)) && !exclude?.includes(s.title)).map((s) => (
        <fieldset key={s.title} className="card form-section">
          <legend>{s.title}</legend>
          <div className="fields">
            {s.fields.map((f, i) => (
              <Field key={'key' in f ? f.key : `${f.kind}-${i}`} f={f} d={details} patch={patch} />
            ))}
          </div>
        </fieldset>
      ))}
    </>
  )
}
