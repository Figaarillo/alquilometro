import type { ShareOptions } from '../../../shared/domain'

const LABELS: [keyof ShareOptions, string, string][] = [
  ['showScore', 'Mostrar el puntaje automático', 'El número y por qué'],
  ['allowRatings', 'Permitir que dejen su valoración', 'Nota del 1 al 10 y un comentario, con su nombre'],
  ['showMyRating', 'Mostrar mi nota personal', ''],
  ['showNotes', 'Mostrar mis notas', 'Tus impresiones privadas'],
  ['showContact', 'Mostrar contacto y teléfono', 'Del dueño o la inmobiliaria'],
]

export function ShareOptionsFields({
  value,
  onChange,
  hide = [],
}: {
  value: ShareOptions
  onChange: (v: ShareOptions) => void
  hide?: (keyof ShareOptions)[]
}) {
  return (
    <div className="share-options">
      {LABELS.filter(([k]) => !hide.includes(k)).map(([k, label, hint]) => (
        <label key={k} className="switch-row">
          <input type="checkbox" checked={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />
          <span>
            {label}
            {hint && <span className="muted small"> · {hint}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}
