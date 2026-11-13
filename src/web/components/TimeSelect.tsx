/**
 * Selector de hora propio: el <input type="time"> nativo depende del celular y obliga a cargar
 * la hora dos veces junto con la fecha. Este respeta la preferencia 24 h / AM-PM de Ajustes.
 */
const MINUTES = [0, 15, 30, 45]
const pad = (n: number) => String(n).padStart(2, '0')

export function TimeSelect({
  value,
  onChange,
  hour12,
  allowEmpty,
  ariaLabel,
}: {
  /** "HH:mm" (24 h) o "" si allowEmpty. */
  value: string
  onChange: (v: string) => void
  hour12: boolean
  allowEmpty?: boolean
  ariaLabel?: string
}) {
  const empty = value === ''
  const [h, m] = empty ? [-1, 0] : value.split(':').map(Number)
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort((a, b) => a - b)
  const set = (hh: number, mm: number) => onChange(`${pad(hh)}:${pad(mm)}`)

  const isPm = h >= 12
  const h12 = h % 12 === 0 ? 12 : h % 12

  return (
    <div className="time-select" aria-label={ariaLabel}>
      {hour12 ? (
        <select
          value={empty ? '' : h12}
          onChange={(e) => {
            if (e.target.value === '') return onChange('')
            const v = Number(e.target.value) % 12
            set(isPm || empty ? v + 12 : v, m)
          }}
        >
          {allowEmpty && <option value="">—</option>}
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      ) : (
        <select value={empty ? '' : h} onChange={(e) => (e.target.value === '' ? onChange('') : set(Number(e.target.value), m))}>
          {allowEmpty && <option value="">—</option>}
          {Array.from({ length: 24 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {pad(n)}
            </option>
          ))}
        </select>
      )}
      <span>:</span>
      <select value={m} disabled={empty} onChange={(e) => set(h, Number(e.target.value))}>
        {minutes.map((n) => (
          <option key={n} value={n}>
            {pad(n)}
          </option>
        ))}
      </select>
      {hour12 && (
        <select value={isPm ? 'pm' : 'am'} disabled={empty} onChange={(e) => set((h % 12) + (e.target.value === 'pm' ? 12 : 0), m)}>
          <option value="am">AM</option>
          <option value="pm">PM</option>
        </select>
      )}
    </div>
  )
}
