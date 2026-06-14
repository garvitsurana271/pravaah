import { useMemo } from 'react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'

const W = 300
const H = 330
const M = 30

const stations = BALASORE_CORRIDOR.stations
const edges = BALASORE_CORRIDOR.edges
const lats = stations.map((s) => s.lat)
const lons = stations.map((s) => s.lon)
const latMin = Math.min(...lats)
const latMax = Math.max(...lats)
const lonMin = Math.min(...lons)
const lonMax = Math.max(...lons)
const px = (lon: number) => M + ((lon - lonMin) / (lonMax - lonMin || 1)) * (W - 2 * M)
const py = (lat: number) => M + ((latMax - lat) / (latMax - latMin || 1)) * (H - 2 * M)
const byId = new Map(stations.map((s) => [s.id, s]))

export function GeoMap({ snap }: { snap: Snapshot }) {
  const trainPts = useMemo(() => {
    return snap.trains
      .filter((t) => t.pos.kind === 'edge')
      .map((t) => {
        const e = edges.find((x) => x.id === t.pos.edgeId)!
        const a = byId.get(e.fromId)!
        const b = byId.get(e.toId)!
        const f = t.pos.frac ?? 0
        return { id: t.id, color: CLASS_META[t.cls].color, x: px(a.lon + (b.lon - a.lon) * f), y: py(a.lat + (b.lat - a.lat) * f) }
      })
  }, [snap])

  const path = stations.map((s) => `${px(s.lon).toFixed(1)},${py(s.lat).toFixed(1)}`).join(' ')

  return (
    <div className="panel-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b hairline px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Geographic View</span>
        <span className="text-[9px] text-muted">SER · Odisha · 21.5°N 86.9°E</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="min-h-0 flex-1" role="img" aria-label="Geographic map of the corridor">
        {/* coastline hint */}
        <path d={`M${W - 14},${M} Q${W - 26},${H / 2} ${W - 10},${H - M}`} fill="none" stroke="rgba(58,160,255,0.18)" strokeWidth={1} strokeDasharray="2 4" />
        <text x={W - 20} y={H - 12} textAnchor="end" className="fill-signal-blue/40" fontSize={8}>
          Bay of Bengal
        </text>
        <polyline points={path} fill="none" stroke="rgba(120,140,170,0.45)" strokeWidth={2} />
        {stations.map((s) => (
          <g key={s.id}>
            <circle cx={px(s.lon)} cy={py(s.lat)} r={s.isJunction ? 4 : 2.8} fill="#0b1422" stroke="#9fb4dd" strokeWidth={1.2} />
            <text x={px(s.lon) + 6} y={py(s.lat) + 3} className="fill-muted" fontSize={8} fontFamily="Fira Code">
              {s.code}
            </text>
          </g>
        ))}
        {trainPts.map((p) => (
          <circle key={p.id} cx={p.x} cy={p.y} r={3.5} fill={p.color} style={{ filter: `drop-shadow(0 0 5px ${p.color})` }} />
        ))}
      </svg>
    </div>
  )
}
