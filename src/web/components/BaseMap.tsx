import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, type ReactNode } from 'react'
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { RefPoint } from '../../shared/domain'

const refIcon = (name: string) =>
  L.divIcon({ className: 'ref-pin', html: `<span>★ ${name}</span>`, iconSize: undefined, iconAnchor: [8, 8] })

function Recenter({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom())
  }, [center?.[0], center?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export function BaseMap({
  refPoints,
  center,
  zoom = 14,
  height = 360,
  onClick,
  recenterOn,
  children,
}: {
  refPoints: RefPoint[]
  center?: [number, number]
  zoom?: number
  height?: number | string
  onClick?: (lat: number, lng: number) => void
  recenterOn?: [number, number] | null
  children?: ReactNode
}) {
  const c: [number, number] = center ?? (refPoints[0] ? [refPoints[0].lat, refPoints[0].lng] : [-32.41, -63.24])
  return (
    <MapContainer center={c} zoom={zoom} style={{ height, width: '100%' }} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {refPoints.map((r) => (
        <Marker key={r.name} position={[r.lat, r.lng]} icon={refIcon(r.name)} interactive={false} />
      ))}
      {refPoints.map((r) => (
        <Circle
          key={`${r.name}-1k`}
          center={[r.lat, r.lng]}
          radius={1000}
          pathOptions={{ color: '#6366f1', weight: 1, fillOpacity: 0.05, dashArray: '4 4' }}
          interactive={false}
        >
          <Tooltip>1 km</Tooltip>
        </Circle>
      ))}
      {onClick && <ClickHandler onClick={onClick} />}
      {recenterOn !== undefined && <Recenter center={recenterOn} />}
      {children}
    </MapContainer>
  )
}
