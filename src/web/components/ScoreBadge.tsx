import { scoreClass } from '../lib/format'

export function ScoreBadge({ score, big }: { score: number | null | undefined; big?: boolean }) {
  return (
    <span className={`score ${scoreClass(score)} ${big ? 'score-big' : ''}`} title="Puntaje automático">
      {score == null ? '—' : Math.round(score)}
    </span>
  )
}
