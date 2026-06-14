import { useMemo, useState } from 'react'
import { Maximize2, Route, Globe2, X } from 'lucide-react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'
import indiaRaw from '../data/india-stations.json'

const INDIA = indiaRaw as [number, number][]

// National projection (whole country)
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

// Regional projection — eastern India around the corridor, for the zoom-in map
const R_LON0 = 85.4
const R_LON1 = 88.3
const R_LAT0 = 20.5
const R_LAT1 = 22.8
const RVW = 900
const RVH = 714
const RPAD = 52
const rpx = (lon: number) => RPAD + ((lon - R_LON0) / (R_LON1 - R_LON0)) * (RVW - 2 * RPAD)
const rpy = (lat: number) => RPAD + ((R_LAT1 - lat) / (R_LAT1 - R_LAT0)) * (RVH - 2 * RPAD)
const regionDots = INDIA.filter(([lon, lat]) => lon >= R_LON0 && lon <= R_LON1 && lat >= R_LAT0 && lat <= R_LAT1)
  .map(([lon, lat]) => `M${rpx(lon).toFixed(1)} ${rpy(lat).toFixed(1)}l.01 0`)
  .join('')
const routePts = stations.map((s) => `${rpx(s.lon).toFixed(1)},${rpy(s.lat).toFixed(1)}`).join(' ')

type TrainPt = { id: string; color: string; x: number; y: number }
type Status = 'ontime' | 'delayed' | 'held'
const ST_COLOR: Record<Status, string> = { ontime: '#22d37a', delayed: '#ffb02e', held: '#ff5050' }
const ST_LABEL: Record<Status, string> = { ontime: 'On time', delayed: 'Delayed', held: 'Held' }
const statusOf = (t: Snapshot['trains'][number]): Status =>
  t.state === 'HELD' || t.state === 'DWELL' ? 'held' : t.delaySec > 300 ? 'delayed' : 'ontime'

// ── National locator: where the corridor sits inside the whole network ───────
function NationalMap({ trains, onClick, big }: { trains: TrainPt[]; onClick?: () => void; big?: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-full w-full ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role="img"
      aria-label="Indian rail network with the Balasore corridor highlighted"
    >
      <path
        d={nationalDots}
        stroke={big ? 'rgba(176,198,232,0.82)' : 'rgba(150,172,208,0.55)'}
        strokeWidth={big ? 2.8 : 1.6}
        strokeLinecap="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={ccx} cy={ccy} r={20} fill="none" stroke="rgba(34,211,122,0.4)" strokeWidth={1} vectorEffect="non-scaling-stroke" className="animate-blip" />
      <polyline points={corridorPath} fill="none" stroke="#22d37a" strokeWidth={big ? 3 : 2} vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 5px #22d37a)' }} />
      {stations.map((s) => (
        <circle key={s.id} cx={px(s.lon)} cy={py(s.lat)} r={big ? 1.7 : 1.4} fill="#0b1422" stroke="#e6edf7" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={ccx + 20} y1={ccy} x2={W - 64} y2={70} stroke="rgba(34,211,122,0.4)" strokeWidth={0.75} vectorEffect="non-scaling-stroke" />
      <text x={W - 62} y={64} className="fill-signal-green" fontSize={big ? 6.5 : 8.5} fontFamily="Fira Code">
        Bahanaga Bazar /
      </text>
      <text x={W - 62} y={74} className="fill-signal-green" fontSize={big ? 6.5 : 8.5} fontFamily="Fira Code">
        Balasore section
      </text>
      {trains.map((p) => (
        <g key={p.id} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 0.16s linear' }}>
          <circle r={big ? 2 : 2.4} fill={p.color} style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />
        </g>
      ))}
    </svg>
  )
}

// A live train on the geographic route: a status dot with its number beside it.
function RouteTrainDot({ x, y, t, side }: { x: number; y: number; t: Snapshot['trains'][number]; side: 'left' | 'right' }) {
  const color = ST_COLOR[statusOf(t)]
  const left = side === 'left'
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: 'transform 0.16s linear' }}>
      <line x1={0} y1={0} x2={left ? -10 : 10} y2={0} stroke={color} strokeWidth={1} opacity={0.6} />
      <g transform={`translate(${left ? -56 : 10}, -10)`}>
        <rect x={0} y={0} width={46} height={20} rx={5} fill="rgba(2,6,23,0.85)" stroke={color} strokeWidth={1.3} />
        <text x={23} y={14} textAnchor="middle" fill="#e6edf7" fontSize={11} fontWeight={700} fontFamily="Fira Code">
          {t.number}
        </text>
      </g>
      <circle r={6} fill={color} stroke="#02060f" strokeWidth={1.2} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </g>
  )
}

// ── The zoom-in: the corridor drawn on the real map of eastern India ─────────
function CorridorRoute({ snap }: { snap: Snapshot }) {
  // De-collide running trains: if two sit within ~34px, nudge the later one up.
  const runningLaid = (() => {
    const pts = snap.trains
      .filter((t) => t.pos.kind === 'edge' && t.pos.edgeId)
      .map((t) => {
        const e = edges.find((x) => x.id === t.pos.edgeId)!
        const a = byId.get(e.fromId)!
        const b = byId.get(e.toId)!
        const f = t.pos.frac ?? 0
        return { t, x: rpx(a.lon + (b.lon - a.lon) * f), y: rpy(a.lat + (b.lat - a.lat) * f) }
      })
      .sort((p, q) => p.y - q.y || p.x - q.x)
    const placed: { x: number; y: number }[] = []
    return pts.map((p) => {
      let y = p.y
      while (placed.some((q) => Math.abs(q.x - p.x) < 52 && Math.abs(q.y - y) < 24)) y -= 24
      placed.push({ x: p.x, y })
      return { ...p, y }
    })
  })()

  const heldByStation = useMemo(() => {
    const m = new Map<string, Snapshot['trains'][number][]>()
    for (const t of snap.trains) {
      if ((t.state === 'HELD' || t.state === 'DWELL') && t.pos.kind === 'station' && t.pos.stationId) {
        const arr = m.get(t.pos.stationId) ?? []
        arr.push(t)
        m.set(t.pos.stationId, arr)
      }
    }
    return m
  }, [snap])

  // Clustered coastal stations (SORO/BNBR/BLS) would stack their labels; fan
  // them into a tidy callout column on the right, with leaders back to the node.
  const labelPos = (() => {
    const arr = stations.map((s) => ({ id: s.id, nx: rpx(s.lon), ny: rpy(s.lat), ly: rpy(s.lat) })).sort((a, b) => a.ny - b.ny)
    const GAP = 30
    for (let i = 1; i < arr.length; i++) if (arr[i].ly < arr[i - 1].ly + GAP) arr[i].ly = arr[i - 1].ly + GAP
    return new Map(arr.map((a) => [a.id, a]))
  })()

  return (
    <svg viewBox={`0 0 ${RVW} ${RVH}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Balasore corridor on the map of eastern India, with live trains">
      {/* faint regional network — the real map underneath */}
      <path d={regionDots} stroke="rgba(150,172,208,0.5)" strokeWidth={2.6} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />

      {/* heading */}
      <text x={44} y={48} className="fill-ink" fontSize={23} fontWeight={700} fontFamily="Fira Code">
        KHARAGPUR → BHADRAK
      </text>
      <text x={45} y={73} className="fill-muted" fontSize={13.5}>
        South Eastern Railway · the Balasore corridor, 122 km, live
      </text>

      {/* the route, drawn through the real station positions */}
      <polyline points={routePts} fill="none" stroke="#22d37a" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 7px #22d37a)' }} />

      {/* single-line sections — the safety-critical crossings */}
      {edges
        .filter((e) => e.tracks === 1)
        .map((e) => {
          const a = byId.get(e.fromId)!
          const b = byId.get(e.toId)!
          return (
            <line key={e.id} x1={rpx(a.lon)} y1={rpy(a.lat)} x2={rpx(b.lon)} y2={rpy(b.lat)} stroke="#3aa0ff" strokeWidth={5} strokeDasharray="1 8" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #3aa0ff)' }} />
          )
        })}

      {/* running trains, on the route — pills to the left, clear of labels */}
      {runningLaid.map(({ t, x, y }) => (
        <RouteTrainDot key={t.id} x={x} y={y} t={t} side="left" />
      ))}

      {/* stations: node on the map, label fanned into a callout on the right */}
      {stations.map((s) => {
        const x = rpx(s.lon)
        const y = rpy(s.lat)
        const lp = labelPos.get(s.id)!
        const held = heldByStation.get(s.id) ?? []
        return (
          <g key={s.id}>
            {Math.abs(lp.ly - y) > 5 && <line x1={x} y1={y} x2={x + 13} y2={lp.ly - 4} stroke="rgba(150,170,205,0.32)" strokeWidth={1} />}
            <circle cx={x} cy={y} r={s.isJunction ? 6 : 4.5} fill="#0b1422" stroke="#9fb4dd" strokeWidth={1.9} />
            {s.isJunction && <circle cx={x} cy={y} r={11} fill="none" stroke="rgba(58,160,255,0.45)" strokeWidth={1} />}
            <text x={x + 16} y={lp.ly - 3} className="fill-ink" fontSize={15} fontWeight={700} fontFamily="Fira Code">
              {s.code}
            </text>
            <text x={x + 16} y={lp.ly + 11} className="fill-muted" fontSize={10.5}>
              {s.name} · {s.km} km
            </text>
            {held.map((t, i) => (
              <RouteTrainDot key={t.id} x={x} y={y + 30 + i * 24} t={t} side="left" />
            ))}
          </g>
        )
      })}

      {/* legend */}
      {(['ontime', 'delayed', 'held'] as const).map((k, i) => (
        <g key={k} transform={`translate(${46 + i * 132}, ${RVH - 26})`}>
          <circle cx={0} cy={-4} r={6} fill={ST_COLOR[k]} />
          <text x={14} y={0} className="fill-muted" fontSize={13}>
            {ST_LABEL[k]}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function GeoMap({ snap }: { snap: Snapshot }) {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<'corridor' | 'national'>('corridor')

  const trainPts = useMemo<TrainPt[]>(
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

  const open = (v: 'corridor' | 'national') => {
    setView(v)
    setExpanded(true)
  }

  return (
    <>
      <div className="panel-recessed flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b hairline px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Indian Railways Network</span>
          <span className="tabular text-[9px] text-muted">{INDIA.length.toLocaleString()} stations · datameet</span>
        </div>
        <div className="relative min-h-0 flex-1">
          <NationalMap trains={trainPts} onClick={() => open('corridor')} />
          <button
            onClick={(e) => { e.stopPropagation(); open('corridor') }}
            aria-label="Zoom into the corridor"
            className="absolute right-2 top-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-edge bg-black/55 px-2 py-1 text-[10px] text-muted backdrop-blur transition-colors hover:border-signal-green/60 hover:text-ink"
          >
            <Maximize2 size={12} /> Zoom in
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-6 backdrop-blur-sm" onClick={() => setExpanded(false)}>
          <div className="panel-raised flex h-[88vh] w-[92vw] max-w-[1180px] flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b hairline px-4 py-2.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink">
                {view === 'corridor' ? 'Balasore Corridor · live route' : `Indian Railways Network · ${INDIA.length.toLocaleString()} stations`}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex overflow-hidden rounded-md border border-edge">
                  <button
                    onClick={() => setView('corridor')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 px-2.5 py-1 text-[11px] transition-colors ${view === 'corridor' ? 'bg-signal-green/15 text-signal-green' : 'text-muted hover:text-ink'}`}
                  >
                    <Route size={13} /> Corridor route
                  </button>
                  <button
                    onClick={() => setView('national')}
                    className={`inline-flex cursor-pointer items-center gap-1.5 border-l border-edge px-2.5 py-1 text-[11px] transition-colors ${view === 'national' ? 'bg-signal-blue/15 text-signal-blue' : 'text-muted hover:text-ink'}`}
                  >
                    <Globe2 size={13} /> Full network
                  </button>
                </div>
                <button onClick={() => setExpanded(false)} aria-label="Close" className="cursor-pointer rounded-md border border-edge bg-black/40 p-1.5 text-muted transition-colors hover:text-ink">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-3">
              {view === 'corridor' ? <CorridorRoute snap={snap} /> : <NationalMap trains={trainPts} big />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
