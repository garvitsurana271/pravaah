import type { Conflict, Direction, Train } from './types'
import { edgeBetween, travelDir } from './corridor'
import type { SimView } from './simulation'

interface Approach {
  trainId: string
  dir: Direction
  etaSec: number
  onEdge: boolean
}

const LOOKAHEAD_SEC = 720
const RISK_HORIZON = 360
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
/** Transparent risk: rises as the contest nears; near-certain once a train is on the line. */
const riskFor = (etaSec: number, imminent: boolean) =>
  imminent ? Math.max(0.92, clamp01((RISK_HORIZON - etaSec) / RISK_HORIZON)) : clamp01((RISK_HORIZON - etaSec) / RISK_HORIZON)

/**
 * Predict where trains will contend for a shared single-line section — head-on
 * (opposing) or following (same direction) — before the dispatcher has to act.
 * Pure read-only scan over the live state; drives the "conflict predicted"
 * markers on the control board.
 */
export function predictConflicts(view: SimView, _simSec: number): Conflict[] {
  const { corridor, trains } = view
  const active = trains.filter((t) => t.state === 'RUNNING' || t.state === 'DWELL' || t.state === 'HELD')
  const out: Conflict[] = []

  for (const e of corridor.edges) {
    if (e.tracks !== 1) continue // single-line sections are where it bites
    const approaches: Approach[] = []

    for (const t of active) {
      const a = approachToEdge(t, e.id, view)
      if (a && a.etaSec <= LOOKAHEAD_SEC) approaches.push(a)
    }
    if (approaches.length < 2) continue

    const ups = approaches.filter((a) => a.dir === 'UP')
    const downs = approaches.filter((a) => a.dir === 'DOWN')
    const nearest = (xs: Approach[]) => xs.reduce((m, x) => (x.etaSec < m.etaSec ? x : m))

    if (ups.length && downs.length) {
      const u = nearest(ups)
      const d = nearest(downs)
      const eta = Math.min(u.etaSec, d.etaSec)
      const imminent = u.onEdge || d.onEdge || eta < 90
      out.push({
        id: `C-${e.id}-headon`,
        kind: 'HEAD_ON',
        resourceId: e.id,
        trainIds: [u.trainId, d.trainId],
        etaSec: Math.round(eta),
        risk: riskFor(eta, imminent),
        severity: imminent ? 'CRITICAL' : 'WARN',
      })
    } else {
      const same = ups.length >= 2 ? ups : downs
      if (same.length >= 2) {
        const sorted = [...same].sort((a, b) => a.etaSec - b.etaSec)
        out.push({
          id: `C-${e.id}-follow`,
          kind: 'FOLLOWING',
          resourceId: e.id,
          trainIds: [sorted[0].trainId, sorted[1].trainId],
          etaSec: Math.round(sorted[1].etaSec),
          risk: riskFor(sorted[1].etaSec, false) * 0.6,
          severity: 'INFO',
        })
      }
    }
  }
  return out.sort((a, b) => a.etaSec - b.etaSec)
}

/** Is train `t` heading into edge `edgeId`, and if so from which side / when? */
function approachToEdge(t: Train, edgeId: string, view: SimView): Approach | null {
  const { index } = view
  // already on the edge
  if (t.pos.kind === 'edge' && t.pos.edgeId === edgeId) {
    return { trainId: t.def.id, dir: t.pos.dir, etaSec: 0, onEdge: true }
  }
  // waiting at one of the edge's end stations, next hop is this edge
  if (t.pos.kind === 'station' && t.pathIdx + 1 < t.path.length) {
    const here = t.pos.stationId
    const next = t.path[t.pathIdx + 1]
    const e = edgeBetween(index, here, next)
    if (e && e.id === edgeId) {
      return { trainId: t.def.id, dir: travelDir(index, here, next), etaSec: 0, onEdge: false }
    }
  }
  // running on the adjacent edge, will roll onto this edge after the next station
  if (t.pos.kind === 'edge' && t.pathIdx + 2 < t.path.length) {
    const arrId = t.path[t.pathIdx + 1]
    const afterId = t.path[t.pathIdx + 2]
    const nextEdge = edgeBetween(index, arrId, afterId)
    if (nextEdge && nextEdge.id === edgeId) {
      const g = index.edgeById.get(t.pos.edgeId)!
      const remainingKm = t.pos.dir === 'UP' ? g.lengthKm - t.pos.offsetKm : t.pos.offsetKm
      const v = Math.max(20, t.speedKmh || g.maxSpeedKmh)
      return {
        trainId: t.def.id,
        dir: travelDir(index, arrId, afterId),
        etaSec: (remainingKm / v) * 3600,
        onEdge: false,
      }
    }
  }
  return null
}
