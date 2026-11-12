import { dismiss, useToasts } from '../lib/toast'

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.kind === 'success' ? '✓' : t.kind === 'error' ? '⚠' : 'ℹ'} {t.text}
        </button>
      ))}
    </div>
  )
}
