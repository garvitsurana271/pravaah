import { useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'
import indiaRaw from '../data/india-stations.json'

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
const cxs = stations.map((s) => px(s.lon))
const cys = stations.map((s) => py(s.lat))
const ccx = (Math.min(...cxs) + Math.max(...cxs)) / 2
const ccy = (Math.min(...cys) + Math.max(...cys)) / 2
const FULL: [number, number, number, number] = [0, 0, W, H]
const FOCUS: [number, number, number, number] = [ccx - 28, ccy - 31, 56, 62]
const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3)

type TrainPt = { id: string; color: string; x: number; y: number }

function MapView({ vb, focused, trains, onToggle, big }: { vb: number[]; focused: boolean; trains: TrainPt[]; onToggle: () => void; big?: boolean }) {
  return (
    <svg viewBox={vb.join(' ')} className="h-full w-full cursor-pointer" onClick={onToggle} role="img" aria-label="National rail network. Click to focus the corridor.">
      <path
        d={nationalDots}
        stroke={big ? 'rgba(176,198,232,0.8)' : 'rgba(150,172,208,0.55)'}
        strokeWidth={big ? 2.8 : 1.6}
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={ccx} cy={ccy} r={26} fill="none" stroke="rgba(34,211,122,0.35)" strokeWidth={1} vectorEffect="non-scaling-stroke" className={focused ? '' : 'animate-blip'} />
      <polyline points={corridorPath} fill="none" stroke="#22d37a" strokeWidth={2} vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 4px #22d37a)' }} />
      {stations.map((s) => (
        <g key={s.id}>
          <circle cx={px(s.lon)} cy={py(s.lat)} r={focused || big ? 1.1 : 1.8} fill="#0b1422" stroke="#e6edf7" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <text x={px(s.lon) + 1.6} y={py(s.lat) - 1.4} fontSize={2.4} fontFamily="Fira Code" className="fill-ink" style={{ opacity: focused ? 1 : 0, transition: 'opacity 0.4s' }}>
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
      {trains.map((p) => (
        <g key={p.id} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 0.16s linear' }}>
          <circle r={focused || big ? 1.2 : 2.4} fill={p.color} style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
        </g>
      ))}
    </svg>
  )
}

export function GeoMap({ snap }: { snap: Snapshot }) {
  const [focused, setFocused] = useState(false)
  const [vb, setVb] = useState<number[]>(FULL)
  const [expanded, setExpanded] = useState(false)
  const vbRef = useRef<number[]>(FULL)
  vbRef.current = vb
  const raf = useRef<number>(0)

  const tween = (to: number[]) => {
    const from = vbRef.current
    const start = performance.now()
    const stepFn = (t: number) => {
      const k = Math.min(1, (t - start) / 600)
      setVb(from.map((f, i) => f + (to[i] - f) * easeOutCubic(k)))
      if (k < 1) raf.current = requestAnimationFrame(stepFn)
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(stepFn)
  }
  const toggleFocus = () => {
    const nf = !focused
    setFocused(nf)
    tween(nf ? FOCUS : FULL)
  }

  const trains = useMemo<TrainPt[]>(
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
    <>
      <div className="panel-recessed flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b hairline px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Indian Railways Network</span>
          <span className="tabular text-[9px] text-muted">{INDIA.length.toLocaleString()} stations · datameet</span>
        </div>
        <div className="relative min-h-0 flex-1">
          <MapView vb={vb} focused={focused} trains={trains} onToggle={toggleFocus} />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); toggleFocus() }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-edge bg-black/55 px-2 py-1 text-[10px] text-muted backdrop-blur transition-colors hover:text-ink"
            >
              {focused ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {focused ? 'Full network' : 'Focus route'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setFocused(false); setVb(FULL); setExpanded(true) }}
              aria-label="Expand map"
              className="cursor-pointer rounded-md border border-edge bg-black/55 p-1 text-muted backdrop-blur transition-colors hover:text-ink"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-6 backdrop-blur-sm" onClick={() => setExpanded(false)}>
          <div className="panel-raised flex h-[88vh] w-[92vw] max-w-[1100px] flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b hairline px-4 py-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">Indian Railways Network · {INDIA.length.toLocaleString()} stations</span>
              <div className="flex items-center gap-2">
                <button onClick={toggleFocus} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-edge bg-black/40 px-2.5 py-1 text-[11px] text-muted transition-colors hover:text-ink">
                  {focused ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  {focused ? 'Full network' : 'Focus the Balasore corridor'}
                </button>
                <button onClick={() => setExpanded(false)} aria-label="Close" className="cursor-pointer rounded-md border border-edge bg-black/40 p-1.5 text-muted transition-colors hover:text-ink">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2">
              <MapView vb={vb} focused={focused} trains={trains} onToggle={toggleFocus} big />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
