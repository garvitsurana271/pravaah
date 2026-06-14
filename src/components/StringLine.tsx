import { useMemo } from 'react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'
import { clock } from './format'

// A time-distance (Marey / string-line) chart: x = time, y = distance along the
// corridor. Each train is a line; opposing trains cross where the lines meet;
// a held train shows a flat segment. This is the canonical railway-control graph.

const W = 1200
const H = 320
const ML = 62
const MR = 20
const MT = 18
const MB = 24
const WINDOW = 1800 // 30 minutes of history

const stations = BALASORE_CORRIDOR.stations
const minKm = stations[0].km
const maxKm = stations[stations.length - 1].km
const yOf = (km: number) => MT + ((km - minKm) / (maxKm - minKm)) * (H - MT - MB)

export function StringLine({ snap }: { snap: Snapshot }) {
  const now = snap.simSec
  const tMin = Math.max(0, now - WINDOW)
  const tMax = Math.max(now, tMin + 1)
  const xOf = (t: number) => ML + ((t - tMin) / (tMax - tMin)) * (W - ML - MR)

  const ticks = useMemo(() => {
    const out: number[] = []
    const start = Math.ceil(tMin / 300) * 300
    for (let t = start; t <= tMax; t += 300) out.push(t)
    return out
  }, [tMin, tMax])

  const lines = useMemo(() => {
    return snap.trains
      .map((t) => {
        const pts = t.trail.filter(([ts]) => ts >= tMin)
        if (pts.length < 2) return null
        const d = pts.map(([ts, km]) => `${xOf(ts).toFixed(1)},${yOf(km).toFixed(1)}`).join(' ')
        const last = pts[pts.length - 1]
        return { id: t.id, color: CLASS_META[t.cls].color, d, lx: xOf(last[0]), ly: yOf(last[1]), num: t.number, arrived: t.state === 'ARRIVED' }
      })
      .filter(Boolean) as { id: string; color: string; d: string; lx: number; ly: number; num: string; arrived: boolean }[]
  }, [snap, tMin, tMax])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Time-distance graph">
      <text x={ML} y={12} className="fill-muted" fontSize={10} fontFamily="Fira Code" fontWeight={600}>
        TIME · DISTANCE  (last 30 min, each line is a train)
      </text>

      {/* station gridlines */}
      {stations.map((s) => (
        <g key={s.id}>
          <line x1={ML} y1={yOf(s.km)} x2={W - MR} y2={yOf(s.km)} stroke="rgba(120,140,170,0.16)" strokeWidth={1} />
          <text x={ML - 8} y={yOf(s.km) + 3.5} textAnchor="end" className="fill-muted" fontSize={10} fontFamily="Fira Code">
            {s.code}
          </text>
        </g>
      ))}

      {/* time gridlines */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={xOf(t)} y1={MT} x2={xOf(t)} y2={H - MB} stroke="rgba(120,140,170,0.1)" strokeWidth={1} />
          <text x={xOf(t)} y={H - 8} textAnchor="middle" className="fill-muted/70" fontSize={9} fontFamily="Fira Code">
            {clock(t).slice(0, 5)}
          </text>
        </g>
      ))}

      {/* train trajectories */}
      {lines.map((l) => (
        <g key={l.id}>
          <polyline points={l.d} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={l.arrived ? 0.45 : 1} style={{ filter: `drop-shadow(0 0 3px ${l.color}99)` }} />
          {!l.arrived && (
            <>
              <circle cx={l.lx} cy={l.ly} r={3} fill={l.color} />
              <text x={l.lx - 5} y={l.ly - 4} textAnchor="end" fill={l.color} fontSize={9} fontFamily="Fira Code" fontWeight={600}>
                {l.num}
              </text>
            </>
          )}
        </g>
      ))}

      {/* now line */}
      <line x1={xOf(tMax)} y1={MT} x2={xOf(tMax)} y2={H - MB} stroke="#22d37a" strokeWidth={1.4} strokeDasharray="3 3" opacity={0.7} />
    </svg>
  )
}
