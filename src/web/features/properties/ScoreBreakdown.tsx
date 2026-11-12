import type { ScoreResult } from '../../../shared/scoring'
import { ScoreBadge } from '../../components/ScoreBadge'
import { money, scoreClass } from '../../lib/format'

export function ScoreBreakdown({ r, compact }: { r: ScoreResult; compact?: boolean }) {
  return (
    <div className="card score-card">
      <div className="score-head">
        <ScoreBadge score={r.total} big />
        <div>
          <div className="strong">Puntaje automático</div>
          <div className="muted small">
            Base {r.base == null ? '—' : Math.round(r.base)}
            {r.adjustments.length > 0 && ` · ajustes ${r.adjustments.reduce((a, x) => a + x.points, 0)}`} · datos {r.completeness}%
          </div>
          <div className="meter">
            <span style={{ width: `${r.completeness}%` }} />
          </div>
        </div>
      </div>

      {r.alerts.length > 0 && (
        <ul className="alerts">
          {r.alerts.map((a, i) => (
            <li key={i} className={`alert alert-${a.level}`}>
              {a.text}
            </li>
          ))}
        </ul>
      )}

      {r.adjustments.length > 0 && (
        <ul className="adjustments">
          {r.adjustments.map((a, i) => (
            <li key={i}>
              <span className="bad strong">{a.points}</span> {a.label}
              {a.detail && <span className="muted small"> ({a.detail})</span>}
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <div className="categories">
          {r.categories.map((c) => (
            <details key={c.key}>
              <summary>
                <span className="cat-label">{c.label}</span>
                <span className="bar">
                  <span className={scoreClass(c.score)} style={{ width: `${c.score ?? 0}%` }} />
                </span>
                <span className="cat-score">{c.score == null ? '?' : Math.round(c.score)}</span>
              </summary>
              <ul className="factors">
                {c.factors
                  .filter((f) => f.weight > 0)
                  .map((f) => (
                    <li key={f.label} className={f.score == null ? 'muted' : ''}>
                      <span>{f.label}</span>
                      {f.detail && <span className="muted small"> · {f.detail}</span>}
                      <span className="spacer" />
                      <span>{f.score == null ? 'sin dato' : Math.round(f.score)}</span>
                    </li>
                  ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      {r.missing.length > 0 && (
        <div className="missing">
          <div className="strong small">Te falta averiguar:</div>
          <div className="chips">
            {r.missing.map((m) => (
              <span key={m} className="chip static">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CostsCard({ r, currency }: { r: ScoreResult; currency?: string | null }) {
  const c = r.costs
  return (
    <div className="card">
      <h3>Costos {currency === 'USD' && <span className="muted small">(convertido a $)</span>}</h3>
      <dl className="kv">
        <dt>Alquiler</dt>
        <dd>{money(c.rent)}</dd>
        <dt>Expensas</dt>
        <dd>{money(c.expenses)}</dd>
        <dt className="strong">Alquiler + expensas</dt>
        <dd className="strong">{money(c.baseMonthly)}</dd>
        <dt>Servicios estimados</dt>
        <dd>{money(c.utilities)}</dd>
        <dt className="strong">Costo real mensual</dt>
        <dd className="strong">{money(c.realMonthly)}</dd>
        <dt>Para entrar</dt>
        <dd>{money(c.entryTotal)}</dd>
      </dl>
    </div>
  )
}
