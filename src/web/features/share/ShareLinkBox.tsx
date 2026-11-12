import { CopyButton } from '../../components/CopyButton'
import { whatsappUrl } from '../../lib/links'

export function ShareLinkBox({ url, name }: { url: string; name?: string }) {
  const text = `Te comparto los alquileres que estoy viendo en Alquilómetro${name ? ` (${name})` : ''}: ${url}`
  return (
    <div className="share-link-box">
      <input readOnly value={url} onFocus={(e) => e.target.select()} />
      <div className="row wrap">
        <CopyButton text={url} label="Copiar link" className="primary" />
        <a className="button" href={whatsappUrl(null, text)} target="_blank" rel="noreferrer">
          Enviar por WhatsApp
        </a>
        <a className="button ghost" href={url} target="_blank" rel="noreferrer">
          Ver como invitado
        </a>
      </div>
    </div>
  )
}
