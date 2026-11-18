import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

/** Pastilla compacta con un select nativo invisible encima: en el celu abre el selector del sistema. */
export function PillSelect({
  icon,
  label,
  value,
  options,
  onChange,
  active,
  title,
}: {
  icon: ReactNode
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
  active?: boolean
  title: string
}) {
  return (
    <label className={`pill-select ${active ? 'on' : ''}`} title={title}>
      {icon}
      <span>{label}</span>
      <ChevronDown size={14} className="pill-chevron" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={title}>
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}
