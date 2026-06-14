import { useMemo } from 'react'
import type { Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { CLASS_META } from '../engine/priorities'
import type { Direction } from '../engine/types'

const VB_W = 1200
const VB_H = 232
const ML = 110
const MR = 64
const PLOT_W = VB_W - ML - MR
const CENTER_Y = 116
const RAIL_GAP = 50 // UP line and DOWN line are visibly separate tracks
const UP_Y = CENTER_Y - RAIL_GAP / 2
const DN_Y = CENTER_Y + RAIL_GAP / 2

const c = BALASORE_CORRIDOR
const minKm = c.stations[0].km
const maxKm = c.stations[c.stations.length - 1].km
const sx = (km: number) => ML + ((km - minKm) / (maxKm - minKm)) * PLOT_W
const stationById = new Map(c.stations.map((s) => [s.id, s]))
const edgeKm = (edgeId: string) => {
  const e = c.edges.find((x) => x.id === edgeId)!
  return { from: stationById.get(e.fromId)!.km, to: stationById.get(e.toId)!.km, e }
}

interface EdgeStatus {
  occupied: boolean
  dir: Direction | null
  blocked: boolean
  conflict: 'none' | 'WARN' | 'CRITICAL'
}

const railY = (dir: Direction | 'single') => (dir === 'single' ? CENTER_Y : dir === 'UP' ? UP_Y : DN_Y)

export function CorridorView({
  snap,
  selectedId,
  onSelect,
}: {
  snap: Snapshot
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const status = useMemo(() => {
    const map = new Map<string, EdgeStatus>()
    for (const e of c.edges) map.set(e.id, { occupied: false, dir: null, blocked: false, conflict: 'none' })
    for (const t of snap.trains) {
      if (t.pos.kind === 'edge' && t.pos.edgeId) {
        const st = map.get(t.pos.edgeId)!
        st.occupied = true
        st.dir = t.pos.dir ?? null
      }
    }
    for (const id of snap.blockedEdgeIds) map.get(id) && (map.get(id)!.blocked = true)
    for (const cf of snap.conflicts) {
      const st = map.get(cf.resourceId)
      if (st && (st.conflict === 'none' || cf.severity === 'CRITICAL')) {
        st.conflict = cf.severity === 'CRITICAL' ? 'CRITICAL' : 'WARN'
      }
    }
    return map
  }, [snap])

  const heldByStation = useMemo(() => {
    const m = new Map<string, typeof snap.trains>()
    for (const t of snap.trains) {
      if ((t.state === 'HELD' || t.state === 'DWELL') && t.pos.kind === 'station' && t.pos.stationId) {
        const arr = m.get(t.pos.stationId) ?? []
        arr.push(t)
        m.set(t.pos.stationId, arr)
      }
    }
    return m
  }, [snap])

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Live corridor control board">
      {/* line labels */}
      <text x={18} y={UP_Y + 4} className="fill-muted" fontSize={11} fontFamily="Fira Code" fontWeight={600}>
        UP LINE
      </text>
      <text x={18} y={DN_Y + 4} className="fill-muted" fontSize={11} fontFamily="Fira Code" fontWeight={600}>
        DN LINE
      </text>

      {/* section bands */}
      {c.edges.map((e) => {
        const { from, to } = edgeKm(e.id)
        const st = status.get(e.id)!
        const x1 = sx(from)
        const x2 = sx(to)
        const single = e.tracks === 1
        return (
          <g key={e.id}>
            {single && (
              <>
                <rect
                  x={x1}
                  y={CENTER_Y - 18}
                  width={x2 - x1}
                  height={36}
                  rx={7}
                  fill={st.dir ? 'rgba(58,160,255,0.06)' : 'rgba(148,163,184,0.04)'}
                  stroke="rgba(58,160,255,0.22)"
                  strokeDasharray="3 4"
                />
                <text x={(x1 + x2) / 2} y={CENTER_Y - 26} textAnchor="middle" className="fill-signal-blue/80" fontSize={10} fontFamily="Fira Code" fontWeight={600}>
                  SINGLE LINE{st.dir ? ` · ${st.dir} LOCKED` : ''}
                </text>
                <RailLine x1={x1} x2={x2} y={CENTER_Y} occupied={st.occupied} dir={st.dir} single />
              </>
            )}
            {!single && (
              <>
                <RailLine x1={x1} x2={x2} y={UP_Y} occupied={st.occupied && st.dir === 'UP'} dir="UP" />
                <RailLine x1={x1} x2={x2} y={DN_Y} occupied={st.occupied && st.dir === 'DOWN'} dir="DOWN" />
                {Array.from({ length: e.blocks - 1 }).map((_, i) => {
                  const bx = x1 + ((i + 1) / e.blocks) * (x2 - x1)
                  return (
                    <g key={i}>
                      <line x1={bx} y1={UP_Y - 5} x2={bx} y2={UP_Y + 5} stroke="rgba(120,140,170,0.22)" strokeWidth={1} />
                      <line x1={bx} y1={DN_Y - 5} x2={bx} y2={DN_Y + 5} stroke="rgba(120,140,170,0.22)" strokeWidth={1} />
                    </g>
                  )
                })}
              </>
            )}
            {st.blocked && (
              <g className="animate-blip">
                <rect x={x1} y={CENTER_Y - 30} width={x2 - x1} height={60} rx={7} fill="rgba(255,77,77,0.13)" stroke="#ff4d4d" strokeDasharray="4 3" />
                <text x={(x1 + x2) / 2} y={CENTER_Y + 48} textAnchor="middle" className="fill-signal-red glow-red" fontSize={11} fontFamily="Fira Code" fontWeight={700}>
                  ⛔ SECTION BLOCKED
                </text>
              </g>
            )}
            {st.conflict !== 'none' && !st.blocked && <ConflictTag x={(x1 + x2) / 2} kind={st.conflict} edgeId={e.id} conflicts={snap.conflicts} />}
          </g>
        )
      })}

      {/* stations */}
      {c.stations.map((s) => {
        const x = sx(s.km)
        const held = heldByStation.get(s.id) ?? []
        return (
          <g key={s.id}>
            <line x1={x} y1={UP_Y - 12} x2={x} y2={DN_Y + 12} stroke="rgba(160,180,210,0.45)" strokeWidth={s.isJunction ? 2.5 : 1.4} />
            <circle cx={x} cy={CENTER_Y} r={s.isJunction ? 5.5 : 4} fill="#0b1422" stroke="#9fb4dd" strokeWidth={1.6} />
            {s.isJunction && <circle cx={x} cy={CENTER_Y} r={10} fill="none" stroke="rgba(58,160,255,0.4)" strokeWidth={1} />}
            <text x={x} y={DN_Y + 34} textAnchor="middle" className="fill-ink" fontSize={13} fontFamily="Fira Code" fontWeight={600}>
              {s.code}
            </text>
            <text x={x} y={DN_Y + 46} textAnchor="middle" className="fill-muted" fontSize={9.5}>
              {s.km} km
            </text>
            {held.map((t, i) => (
              <g key={t.id}>
                <line x1={x - 13} y1={DN_Y + 60 + i * 22} x2={x + 13} y2={DN_Y + 60 + i * 22} stroke="rgba(120,140,170,0.3)" strokeWidth={1} />
                <TrainGlyph x={x} y={DN_Y + 60 + i * 22} t={t} selected={selectedId === t.id} onSelect={onSelect} stationParked />
              </g>
            ))}
          </g>
        )
      })}

      {/* running trains */}
      {snap.trains
        .filter((t) => t.pos.kind === 'edge')
        .map((t) => {
          const { from, to, e } = edgeKm(t.pos.edgeId!)
          const km = from + (t.pos.frac ?? 0) * (to - from)
          const y = e.tracks === 1 ? CENTER_Y : railY(t.pos.dir ?? 'UP')
          return <TrainGlyph key={t.id} x={sx(km)} y={y} t={t} selected={selectedId === t.id} onSelect={onSelect} />
        })}
    </svg>
  )
}

function RailLine({ x1, x2, y, occupied, dir, single }: { x1: number; x2: number; y: number; occupied: boolean; dir: Direction | null; single?: boolean }) {
  const color = occupied ? (dir === 'UP' ? '#3aa0ff' : '#22d3ee') : single ? 'rgba(58,160,255,0.4)' : 'rgba(120,140,170,0.5)'
  return (
    <>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={occupied ? 3.5 : single ? 3 : 2.2} strokeLinecap="round" className={occupied ? 'glow-blue' : ''} />
      {occupied && (
        <line x1={x1} y1={y} x2={x2} y2={y} stroke="#eaf4ff" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 11" className="animate-dash" opacity={0.85} />
      )}
    </>
  )
}

function ConflictTag({ x, kind, edgeId, conflicts }: { x: number; kind: 'WARN' | 'CRITICAL'; edgeId: string; conflicts: Snapshot['conflicts'] }) {
  const cf = conflicts.find((cc) => cc.resourceId === edgeId)
  const color = kind === 'CRITICAL' ? '#ff4d4d' : '#ffb02e'
  const label = cf
    ? `${cf.kind === 'HEAD_ON' ? 'HEAD-ON' : cf.kind === 'FOLLOWING' ? 'FOLLOWING' : cf.kind} ${Math.max(0, Math.round(cf.etaSec / 60))}m`
    : 'CONFLICT'
  return (
    <g className={kind === 'CRITICAL' ? 'animate-blip' : ''}>
      <rect x={x - 52} y={6} width={104} height={20} rx={5} fill="rgba(2,6,23,0.94)" stroke={color} />
      <text x={x} y={20} textAnchor="middle" fill={color} fontSize={10.5} fontFamily="Fira Code" fontWeight={700}>
        ⚠ {label}
      </text>
      <line x1={x} y1={26} x2={x} y2={CENTER_Y - 24} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.55} />
    </g>
  )
}

function TrainGlyph({
  x,
  y,
  t,
  selected,
  onSelect,
  stationParked,
}: {
  x: number
  y: number
  t: Snapshot['trains'][number]
  selected: boolean
  onSelect: (id: string | null) => void
  stationParked?: boolean
}) {
  const meta = CLASS_META[t.cls]
  const w = 42
  const h = 19
  const movingRight = t.direction === 'UP'
  const held = t.state === 'HELD'
  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`} onClick={() => onSelect(selected ? null : t.id)} style={{ cursor: 'pointer' }} className="animate-rise">
      {selected && <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={6} fill="none" stroke="#e6edf7" strokeWidth={1.5} />}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={4.5}
        fill={meta.color}
        opacity={held ? 0.5 : 1}
        stroke={held ? '#ffb02e' : 'rgba(255,255,255,0.55)'}
        strokeWidth={held ? 1.6 : 0.75}
        style={{ filter: `drop-shadow(0 0 6px ${meta.color}aa)` }}
      />
      <path d={movingRight ? `M${w},2 L${w + 7},${h / 2} L${w},${h - 2} Z` : `M0,2 L-7,${h / 2} L0,${h - 2} Z`} fill={meta.color} opacity={held ? 0.5 : 1} />
      <text x={w / 2} y={h / 2 + 3.6} textAnchor="middle" fill="#02060f" fontSize={10} fontFamily="Fira Code" fontWeight={700}>
        {t.number}
      </text>
      {!stationParked && t.speedKmh > 0 && (
        <text x={w / 2} y={-5} textAnchor="middle" className="fill-muted" fontSize={9} fontFamily="Fira Code">
          {t.speedKmh}
        </text>
      )}
      {held && (
        <text x={w / 2} y={h + 11} textAnchor="middle" className="fill-signal-amber" fontSize={8.5} fontFamily="Fira Code" fontWeight={600}>
          HELD
        </text>
      )}
    </g>
  )
}
