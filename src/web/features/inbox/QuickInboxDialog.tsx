import { Link } from 'react-router'
import { Modal } from '../../components/Modal'
import { InboxQuickAdd } from './InboxPage'

export function QuickInboxDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Anotar pendiente" onClose={onClose}>
      <InboxQuickAdd onDone={onClose} autoFocus />
      <p className="muted small">
        Queda en{' '}
        <Link to="/pendientes" onClick={onClose}>
          Pendientes
        </Link>{' '}
        para cargarlo como alquiler cuando puedas.
      </p>
    </Modal>
  )
}
