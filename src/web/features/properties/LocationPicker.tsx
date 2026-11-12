import { useState } from 'react'
import { CircleMarker } from 'react-leaflet'
import { BaseMap } from '../../components/BaseMap'
import { useSettings } from '../../hooks'
import { toast } from '../../lib/toast'

interface Result {
  display_name: string
  lat: string
  lon: string
}

/** Buscador con Nominatim (OpenStreetMap). Se usa solo al apretar "Buscar". */
async function geocode(q: string): Promise<Result[]> {
  const query = /villa mar/i.test(q) ? q : `${q}, Villa María, Córdoba, Argentina`
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ar&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
  if (!res.ok) throw new Error('No pude buscar la dirección')
  return res.json()
}

export function LocationPicker({
  address,
  lat,
  lng,
  onChange,
}: {
  address: string
  lat: number | null | undefined
  lng: number | null | undefined
  onChange: (p: { address?: string; lat?: number | null; lng?: number | null }) => void
}) {
  const settings = useSettings()
  const [results, setResults] = useState<Result[]>([])
  const [searching, setSearching] = useState(false)
  const point: [number, number] | null = lat != null && lng != null ? [lat, lng] : null

  const search = async () => {
    if (!address.trim()) return
    setSearching(true)
    try {
      const r = await geocode(address)
      setResults(r)
      if (r.length === 0) toast.info('No encontré la dirección. Marcala haciendo click en el mapa.')
      if (r.length === 1) onChange({ lat: Number(r[0].lat), lng: Number(r[0].lon) })
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSearching(false)
    }
  }

  return (
    <fieldset className="card form-section">
      <legend>Ubicación</legend>
      <div className="row">
        <input
          value={address}
          onChange={(e) => onChange({ address: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), search())}
          placeholder="Dirección, ej: Mendoza 1200"
        />
        <button type="button" onClick={search} disabled={searching}>
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
        {point && (
          <button type="button" className="ghost" onClick={() => onChange({ lat: null, lng: null })}>
            Quitar marca
          </button>
        )}
      </div>
      {results.length > 1 && (
        <ul className="plain geo-results">
          {results.map((r) => (
            <li key={`${r.lat},${r.lon}`}>
              <button
                type="button"
                className="ghost small"
                onClick={() => {
                  onChange({ lat: Number(r.lat), lng: Number(r.lon) })
                  setResults([])
                }}
              >
                📍 {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Click en el mapa para marcar o corregir la ubicación exacta.</p>
      <BaseMap
        refPoints={settings.refPoints}
        center={point ?? undefined}
        zoom={15}
        height={340}
        recenterOn={point}
        onClick={(la, ln) => onChange({ lat: la, lng: ln })}
      >
        {point && <CircleMarker center={point} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />}
      </BaseMap>
    </fieldset>
  )
}
