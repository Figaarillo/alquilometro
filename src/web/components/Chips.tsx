/** Botones tipo "chip": un toque y listo, ideal para completar desde el celular en la visita. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[]
  value: T | null | undefined
  onChange: (v: T | null) => void
}) {
  return (
    <div className="chips">
      {options.map(([v, label]) => (
        <button
          type="button"
          key={v}
          className={value === v ? 'chip on' : 'chip'}
          onClick={() => onChange(value === v ? null : v)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function MultiChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[]
  value: T[] | null | undefined
  onChange: (v: T[] | null) => void
}) {
  const set = new Set(value ?? [])
  return (
    <div className="chips">
      {options.map(([v, label]) => (
        <button
          type="button"
          key={v}
          className={set.has(v) ? 'chip on' : 'chip'}
          onClick={() => {
            set.has(v) ? set.delete(v) : set.add(v)
            onChange(set.size ? [...set] : null)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const YES_NO = [
  ['si', 'Sí'],
  ['no', 'No'],
] as const

export function YesNo({ value, onChange }: { value: boolean | null | undefined; onChange: (v: boolean | null) => void }) {
  const current = value == null ? null : value ? 'si' : 'no'
  return <Chips options={YES_NO} value={current} onChange={(v) => onChange(v == null ? null : v === 'si')} />
}
