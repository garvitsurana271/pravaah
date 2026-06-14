import { useMemo } from 'react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'
import indiaRaw from '../data/india-stations.json'

// Real Indian Railways stations from the open datameet dataset (CC0).
const INDIA = indiaRaw as [number, number][]

const W = 300
const H = 330
const M = 14
// India bounding box (matches the generator).
const LON0 = 68
const LON1 = 98
const LAT0 = 6
const LAT1 = 37.5
const px = (lon: number) => M + ((lon - LON0) / (LON1 - LON0)) * (W - 2 * M)
const py = (lat: number) => M + ((LAT1 - lat) / (LAT1 - LAT0)) * (H - 2 * M)

const stations = BALASORE_CORRIDOR.stations
const edges = BALASORE_CORRIDOR.edges
const byId = new Map(stations.map((s) => [s.id, s]))

// Static layers (national dots + our corridor) — built once, never re-diffed.
const nationalDots = INDIA.map(([lon, lat]) => `M${px(lon).toFixed(1)} ${py(lat).toFixed(1)}l.01 0`).join('')
const corridorPath = stations.map((s) => `${px(s.lon).toFixed(1)},${py(s.lat).toFixed(1)}`).join(' ')
const cx0 = px(stations[0].lon)
const cy0 = py(stations[0].lat)
const cxN = px(stations[stations.length - 1].lon)
const cyN = py(stations[stations.length - 1].lat)

export function GeoMap({ snap }: { snap: Snapshot }) {
  const backdrop = useMemo(
    () => (
      <g>
        <path d={nationalDots} stroke="rgba(150,172,208,0.55)" strokeWidth={1.6} strokeLinecap="round" fill="none" />
        {/* highlight ring around our section */}
        <circle cx={(cx0 + cxN) / 2} cy={(cy0 + cyN) / 2} r={26} fill="none" stroke="rgba(34,211,122,0.35)" strokeWidth={1} />
        <polyline points={corridorPath} fill="none" stroke="#22d37a" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 4px #22d37a)' }} />
        {stations.map((s) => (
          <circle key={s.id} cx={px(s.lon)} cy={py(s.lat)} r={s.isJunction ? 2.6 : 1.8} fill="#0b1422" stroke="#e6edf7" strokeWidth={1} />
        ))}
        <line x1={(cx0 + cxN) / 2 + 26} y1={(cy0 + cyN) / 2} x2={W - 64} y2={70} stroke="rgba(34,211,122,0.4)" strokeWidth={0.75} />
        <text x={W - 62} y={64} className="fill-signal-green" fontSize={8.5} fontFamily="Fira Code">
          Bahanaga Bazar /
        </text>
        <text x={W - 62} y={74} className="fill-signal-green" fontSize={8.5} fontFamily="Fira Code">
          Balasore section
        </text>
      </g>
    ),
    [],
  )

  const trainPts = useMemo(
    () =>
      snap.trains
        .filter((t) => t.pos.kind === 'edge')
        .map((t) => {
          const e = edges.find((x) => x.id === t.pos.edgeId)!
          const a = byId.get(e.fromId)!
          const b = byId.get(e.toId)!
          const f = t.pos.frac ?? 0
          return { id: t.id, color: CLASS_META[t.cls].color, x: px(a.lon + (b.lon - a.lon) * f), y: py(a.lat + (b.lat - a.lat) * f) }
        }),
    [snap],
  )

  return (
    <div className="panel-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b hairline px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Indian Railways Network</span>
        <span className="tabular text-[9px] text-muted">{INDIA.length.toLocaleString()} stations · datameet</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="min-h-0 flex-1" role="img" aria-label="Live position on the national rail network">
        {backdrop}
        {trainPts.map((p) => (
          <circle key={p.id} cx={p.x} cy={p.y} r={2.4} fill={p.color} style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
        ))}
      </svg>
    </div>
  )
}
