import { useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'
import indiaRaw from '../data/india-stations.json'

// Real Indian Railways stations from the open datameet dataset (CC0).
const INDIA = indiaRaw as [number, number][]

const W = 300
const H = 330
const M = 14
const LON0 = 68
const LON1 = 98
const LAT0 = 6
const LAT1 = 37.5
const px = (lon: number) => M + ((lon - LON0) / (LON1 - LON0)) * (W - 2 * M)
const py = (lat: number) => M + ((LAT1 - lat) / (LAT1 - LAT0)) * (H - 2 * M)

const stations = BALASORE_CORRIDOR.stations
const edges = BALASORE_CORRIDOR.edges
const byId = new Map(stations.map((s) => [s.id, s]))

const nationalDots = INDIA.map(([lon, lat]) => `M${px(lon).toFixed(1)} ${py(lat).toFixed(1)}l.01 0`).join('')
const corridorPath = stations.map((s) => `${px(s.lon).toFixed(1)},${py(s.lat).toFixed(1)}`).join(' ')

// view boxes: whole country, and zoomed onto the Balasore corridor
const FULL: [number, number, number, number] = [0, 0, W, H]
const cxs = stations.map((s) => px(s.lon))
const cys = stations.map((s) => py(s.lat))
const ccx = (Math.min(...cxs) + Math.max(...cxs)) / 2
const ccy = (Math.min(...cys) + Math.max(...cys)) / 2
const FOCUS: [number, number, number, number] = [ccx - 28, ccy - 31, 56, 62]
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3)

export function GeoMap({ snap }: { snap: Snapshot }) {
  const [focused, setFocused] = useState(false)
  const [vb, setVb] = useState<number[]>(FULL)
  const vbRef = useRef<number[]>(FULL)
  vbRef.current = vb
  const raf = useRef<number>(0)

  const tween = (to: number[]) => {
    const from = vbRef.current
    const start = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 600)
      const e = easeOutCubic(k)
      setVb(from.map((f, i) => f + (to[i] - f) * e))
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
  }

  const toggle = (next?: boolean) => {
    const nf = next ?? !focused
    setFocused(nf)
    tween(nf ? FOCUS : FULL)
  }

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
      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={vb.join(' ')}
          className="h-full w-full cursor-pointer"
          onClick={() => toggle()}
          role="img"
          aria-label="National rail network. Click to focus the corridor."
        >
          <path d={nationalDots} stroke="rgba(150,172,208,0.55)" strokeWidth={1.6} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
          <circle cx={ccx} cy={ccy} r={26} fill="none" stroke="rgba(34,211,122,0.35)" strokeWidth={1} vectorEffect="non-scaling-stroke" className={focused ? '' : 'animate-blip'} />
          <polyline points={corridorPath} fill="none" stroke="#22d37a" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 4px #22d37a)' }} />
          {stations.map((s) => (
            <g key={s.id}>
              <circle cx={px(s.lon)} cy={py(s.lat)} r={focused ? 1.1 : 1.8} fill="#0b1422" stroke="#e6edf7" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              <text
                x={px(s.lon) + 1.6}
                y={py(s.lat) - 1.4}
                fontSize={2.4}
                fontFamily="Fira Code"
                className="fill-ink"
                style={{ opacity: focused ? 1 : 0, transition: 'opacity 0.4s' }}
              >
                {s.code}
              </text>
            </g>
          ))}
          {!focused && (
            <>
              <line x1={ccx + 26} y1={ccy} x2={W - 64} y2={70} stroke="rgba(34,211,122,0.4)" strokeWidth={0.75} />
              <text x={W - 62} y={64} className="fill-signal-green" fontSize={8.5} fontFamily="Fira Code">
                Bahanaga Bazar /
              </text>
              <text x={W - 62} y={74} className="fill-signal-green" fontSize={8.5} fontFamily="Fira Code">
                Balasore section
              </text>
            </>
          )}
          {trainPts.map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y} r={focused ? 1.1 : 2.4} fill={p.color} style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
          ))}
        </svg>
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggle()
          }}
          className="absolute right-2 top-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-edge bg-black/55 px-2 py-1 text-[10px] text-muted backdrop-blur transition-colors hover:text-ink"
        >
          {focused ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {focused ? 'Full network' : 'Focus corridor'}
        </button>
      </div>
    </div>
  )
}
