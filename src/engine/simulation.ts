import type {
  Conflict,
  Corridor,
  Decision,
  Direction,
  Disruption,
  Edge,
  Kpis,
  Train,
  TrainDef,
} from './types'
import { buildIndex, edgeBetween, pathBetween, travelDir, type CorridorIndex } from './corridor'
import { classWeight } from './priorities'
import { resolveContention, toDecision, type Candidate, type DispatchContext } from './dispatcher'
import { predictConflicts } from './conflicts'

const DWELL_SEC = 45
const CLEAR_BUFFER_SEC = 90

export type Policy = 'OPTIMIZER' | 'FCFS'

export interface SimOptions {
  policy?: Policy
  seedDelaySec?: number
}

export interface RenderPos {
  kind: 'station' | 'edge'
  stationId?: string
  onLoop?: boolean
  edgeId?: string
  frac?: number // 0 at edge.fromId … 1 at edge.toId
  dir?: Direction
}

export interface TrainView {
  id: string
  number: string
  name: string
  cls: Train['def']['cls']
  direction: Direction
  state: Train['state']
  pos: RenderPos
  speedKmh: number
  delaySec: number
  heldReason: string | null
  destCode: string
}

export interface SimEvent {
  atSec: number
  text: string
  severity: 'INFO' | 'WARN' | 'CRITICAL'
}

export interface Snapshot {
  simSec: number
  policy: Policy
  trains: TrainView[]
  kpis: Kpis
  decisions: Decision[]
  conflicts: Conflict[]
  events: SimEvent[]
  blockedEdgeIds: string[]
}

/** A read-only projection of internal state, for conflict prediction. */
export interface SimView {
  index: CorridorIndex
  corridor: Corridor
  trains: Train[]
  edgeLockDir: (edgeId: string) => Direction | null
  isBlocked: (edgeId: string) => boolean
}

export class Simulation {
  readonly corridor: Corridor
  readonly index: CorridorIndex
  policy: Policy

  simSec = 0
  trains: Train[] = []
  decisions: Decision[] = []
  events: SimEvent[] = []

  private blocks = new Map<string, string | null>()
  private trainBlockIdx = new Map<string, number>() // train -> the block index it OWNS
  private edgeLock = new Map<string, { dir: Direction | null; count: number }>()
  private loopHeld = new Map<string, Set<string>>()
  private blockedEdges = new Map<string, number>() // edgeId -> expiry sec
  private disruptions: Disruption[]
  private firedDisruptions = new Set<number>()
  private stallUntil = new Map<string, number>()
  private decisionCounter = 0
  private resolvedContentions = new Set<string>() // de-dupe decisions per crossing
  private conflictsResolved = 0
  private unsafePrevented = 0

  constructor(corridor: Corridor, defs: TrainDef[], disruptions: Disruption[] = [], opts: SimOptions = {}) {
    this.corridor = corridor
    this.index = buildIndex(corridor)
    this.policy = opts.policy ?? 'OPTIMIZER'
    this.disruptions = disruptions
    this.trains = defs.map((d) => this.makeTrain(d))
    for (const e of corridor.edges) if (e.tracks === 1) this.edgeLock.set(e.id, { dir: null, count: 0 })
  }

  private makeTrain(def: TrainDef): Train {
    const path = pathBetween(this.corridor, this.index, def.entryStationId, def.exitStationId)
    return {
      def,
      state: 'SCHEDULED',
      pos: { kind: 'station', stationId: def.entryStationId, onLoop: false },
      speedKmh: 0,
      pathIdx: 0,
      path,
      delaySec: 0,
      enteredSec: null,
      arrivedSec: null,
      heldReason: null,
      heldSec: 0,
    }
  }

  // ── block / lock bookkeeping ──────────────────────────────────────────────

  private blockKey(e: Edge, dir: Direction, idx: number): string {
    return e.tracks === 1 ? `${e.id}#S#${idx}` : `${e.id}#${dir}#${idx}`
  }
  private blockLen(e: Edge) {
    return e.lengthKm / e.blocks
  }
  private loopCountAt(stationId: string) {
    return this.loopHeld.get(stationId)?.size ?? 0
  }
  private loopFreeAt = (stationId: string): boolean => {
    const st = this.index.stationById.get(stationId)!
    return this.loopCountAt(stationId) < st.loopLines
  }
  private holdOnLoop(t: Train, stationId: string) {
    if (!this.loopHeld.has(stationId)) this.loopHeld.set(stationId, new Set())
    this.loopHeld.get(stationId)!.add(t.def.id)
    if (t.pos.kind === 'station') t.pos.onLoop = true
  }
  private releaseLoop(t: Train, stationId: string) {
    this.loopHeld.get(stationId)?.delete(t.def.id)
  }

  private canEnterEdge(e: Edge, dir: Direction): boolean {
    if (this.isBlocked(e.id)) return false
    const entryIdx = dir === 'UP' ? 0 : e.blocks - 1
    if (this.blocks.get(this.blockKey(e, dir, entryIdx))) return false
    if (e.tracks === 1) {
      const lock = this.edgeLock.get(e.id)!
      if (lock.dir !== null && lock.dir !== dir) return false
    }
    return true
  }

  isBlocked = (edgeId: string): boolean => {
    const exp = this.blockedEdges.get(edgeId)
    return exp != null && exp > this.simSec
  }
  edgeLockDir = (edgeId: string): Direction | null => this.edgeLock.get(edgeId)?.dir ?? null

  // ── main tick ─────────────────────────────────────────────────────────────

  step(dtSec: number): void {
    this.simSec += dtSec
    this.applyDisruptions()
    this.moveRunningTrains(dtSec)
    this.spawnScheduled()
    this.processDepartures()
    this.accrueDelays(dtSec)
  }

  private applyDisruptions() {
    this.disruptions.forEach((d, i) => {
      if (this.firedDisruptions.has(i) || d.atSec > this.simSec) return
      this.firedDisruptions.add(i)
      if (d.kind === 'BLOCK_EDGE') {
        this.blockedEdges.set(d.edgeId, this.simSec + d.forSec)
        this.log('CRITICAL', d.note || `Section ${d.edgeId.toUpperCase()} blocked`)
      } else if (d.kind === 'DELAY_TRAIN') {
        const t = this.trains.find((x) => x.def.id === d.trainId)
        if (t) {
          this.stallUntil.set(t.def.id, this.simSec + d.bySec)
          this.log('WARN', d.note || `${t.def.number} delayed ${Math.round(d.bySec / 60)} min`)
        }
      } else if (d.kind === 'UNSAFE_ROUTE_ATTEMPT') {
        this.handleUnsafeAttempt(d.trainId, d.edgeId, d.note)
      }
    })
  }

  /** The Balasore failure mode: a route is mis-set toward an occupied line.
   *  The interlocking refuses the admission — proof the safety floor holds. */
  private handleUnsafeAttempt(trainId: string, edgeId: string, note: string) {
    const t = this.trains.find((x) => x.def.id === trainId)
    const e = this.index.edgeById.get(edgeId)
    if (!t || !e) return
    const dir = t.pos.kind === 'station' && t.pathIdx + 1 < t.path.length
      ? travelDir(this.index, t.path[t.pathIdx], t.path[t.pathIdx + 1])
      : 'UP'
    const safe = this.canEnterEdge(e, dir)
    if (!safe) {
      this.unsafePrevented += 1
      this.decisionCounter += 1
      this.decisions.unshift({
        id: `D${this.decisionCounter}`,
        atSec: this.simSec,
        kind: 'SAFETY_REFUSAL',
        policy: this.policy,
        stationId: t.pos.kind === 'station' ? t.pos.stationId : t.path[t.pathIdx],
        resourceId: edgeId,
        trainIds: [trainId],
        options: [],
        chosenOrder: [],
        reason: `INTERLOCKING REFUSED a route that would admit ${t.def.number} into ${edgeId.toUpperCase()} while it is occupied. Admission blocked; ${t.def.number} held at signal.`,
        safetyNote: note,
      })
      this.log('CRITICAL', `⛔ Unsafe route refused: ${t.def.number} → ${edgeId.toUpperCase()} (line occupied). Collision prevented.`)
    }
  }

  private moveRunningTrains(dtSec: number) {
    for (const t of this.trains) {
      if (t.state !== 'RUNNING' || t.pos.kind !== 'edge') continue
      const stall = this.stallUntil.get(t.def.id)
      if (stall != null && stall > this.simSec) {
        t.speedKmh = 0
        continue
      }
      const pos = t.pos // narrowed to the edge position
      const e = this.index.edgeById.get(pos.edgeId)!
      const dir = pos.dir
      const len = this.blockLen(e)
      const v = Math.min(t.def.maxSpeedKmh, e.maxSpeedKmh)
      let remaining = (v * dtSec) / 3600
      let idx = this.trainBlockIdx.get(t.def.id)! // the block the train OWNS
      let moved = false
      let arrived = false

      while (remaining > 1e-9) {
        // Boundary of the currently-owned block, in the travel direction.
        const boundary = dir === 'UP' ? (idx + 1) * len : idx * len
        const dist = Math.abs(boundary - pos.offsetKm)
        const step = Math.min(remaining, dist)
        pos.offsetKm += dir === 'UP' ? step : -step
        remaining -= step
        if (step > 0) moved = true
        if (Math.abs(pos.offsetKm - boundary) > 1e-6) break // ran out of distance mid-block

        const nextIdx = dir === 'UP' ? idx + 1 : idx - 1
        if (nextIdx < 0 || nextIdx >= e.blocks) {
          this.arrive(t, e, dir)
          arrived = true
          break
        }
        const nextKey = this.blockKey(e, dir, nextIdx)
        if (this.blocks.get(nextKey)) {
          // Block ahead occupied — hold at the signal, keep our own block.
          pos.offsetKm = boundary
          t.speedKmh = 0
          break
        }
        this.blocks.set(this.blockKey(e, dir, idx), null)
        this.blocks.set(nextKey, t.def.id)
        idx = nextIdx
        this.trainBlockIdx.set(t.def.id, idx)
      }
      if (!arrived && t.state === 'RUNNING') t.speedKmh = moved ? v : 0
    }
  }

  private arrive(t: Train, e: Edge, dir: Direction) {
    // free the owned block + single-line lock
    const idx = this.trainBlockIdx.get(t.def.id)
    if (idx !== undefined) {
      this.blocks.set(this.blockKey(e, dir, idx), null)
      this.trainBlockIdx.delete(t.def.id)
    }
    if (e.tracks === 1) {
      const lock = this.edgeLock.get(e.id)!
      lock.count = Math.max(0, lock.count - 1)
      if (lock.count === 0) lock.dir = null
    }
    t.pathIdx += 1
    const stationId = t.path[t.pathIdx]
    if (stationId === t.def.exitStationId) {
      t.state = 'ARRIVED'
      t.arrivedSec = this.simSec
      t.speedKmh = 0
      t.pos = { kind: 'station', stationId, onLoop: false }
      this.log('INFO', `${t.def.number} cleared the section at ${this.code(stationId)}.`)
    } else {
      const stops = t.def.stops.includes(stationId)
      t.state = 'DWELL'
      t.speedKmh = 0
      t.pos = { kind: 'station', stationId, onLoop: false }
      t.heldReason = null
      ;(t as Train & { readySec?: number; dwellUntil?: number }).readySec = this.simSec
      ;(t as Train & { readySec?: number; dwellUntil?: number }).dwellUntil =
        this.simSec + (stops ? DWELL_SEC : 0)
    }
  }

  private spawnScheduled() {
    for (const t of this.trains) {
      if (t.state !== 'SCHEDULED') continue
      const stall = this.stallUntil.get(t.def.id)
      const entry = t.def.entrySec + (stall && stall > t.def.entrySec ? 0 : 0)
      if (this.simSec < entry) continue
      t.state = 'DWELL'
      ;(t as Train & { readySec?: number; dwellUntil?: number }).readySec = this.simSec
      ;(t as Train & { readySec?: number; dwellUntil?: number }).dwellUntil = this.simSec
    }
  }

  private dispatchCtx(): DispatchContext {
    return {
      index: this.index,
      weightOf: (t) => classWeight(t.def.cls),
      estimateClearSec: (edge, t) =>
        (edge.lengthKm / Math.min(t.def.maxSpeedKmh, edge.maxSpeedKmh)) * 3600 + CLEAR_BUFFER_SEC,
      loopFreeAt: this.loopFreeAt,
    }
  }

  private processDepartures() {
    type Ext = Train & { readySec?: number; dwellUntil?: number }
    const ready: { t: Ext; edge: Edge; dir: Direction; next: string }[] = []
    for (const tt of this.trains as Ext[]) {
      if (tt.state !== 'DWELL' && tt.state !== 'HELD') continue
      if ((tt.dwellUntil ?? 0) > this.simSec) continue
      if (tt.pos.kind !== 'station') continue
      const here = tt.pos.stationId
      if (here === tt.def.exitStationId) continue
      if (tt.pathIdx + 1 >= tt.path.length) continue
      const next = tt.path[tt.pathIdx + 1]
      const edge = edgeBetween(this.index, here, next)
      if (!edge) continue
      ready.push({ t: tt, edge, dir: travelDir(this.index, here, next), next })
    }

    // group by contended edge
    const groups = new Map<string, typeof ready>()
    for (const r of ready) {
      if (!groups.has(r.edge.id)) groups.set(r.edge.id, [])
      groups.get(r.edge.id)!.push(r)
    }

    for (const [edgeId, group] of groups) {
      const edge = this.index.edgeById.get(edgeId)!
      if (group.length === 1) {
        const r = group[0]
        if (this.canEnterEdge(edge, r.dir)) this.grantEntry(r.t, edge, r.dir)
        else this.hold(r.t, 'Section ahead occupied / locked — waiting for line clear')
        continue
      }

      // Contention: ask the dispatcher for an order.
      const candidates: Candidate[] = group.map((r) => ({
        train: r.t,
        readySec: (r.t as Ext).readySec ?? this.simSec,
      }))
      const res = resolveContention(this.policy, edge, candidates, this.dispatchCtx())
      const dirs = new Set(group.map((r) => r.dir))
      const kind: Decision['kind'] = dirs.size > 1 ? 'CROSS' : 'PRECEDENCE'

      // enact: grant first in order that can enter now; hold the rest
      const ordered = res.order
        .map((id) => group.find((r) => r.t.def.id === id)!)
        .filter(Boolean) as typeof group
      let granted = false
      for (let i = 0; i < ordered.length; i++) {
        const r = ordered[i]
        if (!granted && this.canEnterEdge(edge, r.dir)) {
          this.grantEntry(r.t, edge, r.dir)
          granted = true
        } else {
          this.hold(r.t, i === 0 ? 'Awaiting line clear' : `Looped behind ${ordered[0].t.def.number}`)
        }
      }

      // log the decision once per materialised crossing
      const sig = `${edgeId}:${res.order.join('>')}:${Math.floor(this.simSec / 120)}`
      if (granted && !this.resolvedContentions.has(sig)) {
        this.resolvedContentions.add(sig)
        this.conflictsResolved += 1
        this.decisionCounter += 1
        const stationId = group[0].t.pos.kind === 'station' ? group[0].t.pos.stationId : group[0].next
        this.decisions.unshift(toDecision(this.decisionCounter, this.simSec, this.policy, stationId, edge, candidates, res, kind))
        this.log('INFO', `${kind === 'CROSS' ? 'Crossing' : 'Precedence'} at ${this.code(stationId)}: ${res.reason}`)
      }
    }
  }

  private grantEntry(t: Train, e: Edge, dir: Direction) {
    const here = t.pos.kind === 'station' ? t.pos.stationId : t.path[t.pathIdx]
    this.releaseLoop(t, here)
    const entryIdx = dir === 'UP' ? 0 : e.blocks - 1
    this.blocks.set(this.blockKey(e, dir, entryIdx), t.def.id)
    this.trainBlockIdx.set(t.def.id, entryIdx)
    if (e.tracks === 1) {
      const lock = this.edgeLock.get(e.id)!
      lock.dir = dir
      lock.count += 1
    }
    t.state = 'RUNNING'
    t.heldReason = null
    if (t.enteredSec === null) t.enteredSec = this.simSec
    t.pos = { kind: 'edge', edgeId: e.id, dir, offsetKm: dir === 'UP' ? 0 : e.lengthKm }
    t.speedKmh = Math.min(t.def.maxSpeedKmh, e.maxSpeedKmh)
  }

  private hold(t: Train, reason: string) {
    t.state = 'HELD'
    t.speedKmh = 0
    t.heldReason = reason
    const here = t.pos.kind === 'station' ? t.pos.stationId : t.path[t.pathIdx]
    if (this.loopFreeAt(here)) this.holdOnLoop(t, here)
  }

  private accrueDelays(dtSec: number) {
    for (const t of this.trains) {
      const stalled = (this.stallUntil.get(t.def.id) ?? 0) > this.simSec
      const waiting = t.state === 'HELD' || (t.state === 'RUNNING' && t.speedKmh === 0) || stalled
      if (waiting && (t.state === 'RUNNING' || t.state === 'HELD' || t.state === 'DWELL')) {
        t.delaySec += dtSec
        if (t.state === 'HELD') t.heldSec += dtSec
      }
    }
  }

  // ── outputs ────────────────────────────────────────────────────────────────

  private code(stationId: string) {
    return this.index.stationById.get(stationId)?.code ?? stationId.toUpperCase()
  }
  private log(severity: SimEvent['severity'], text: string) {
    this.events.unshift({ atSec: this.simSec, text, severity })
    if (this.events.length > 60) this.events.pop()
  }

  private kpis(): Kpis {
    let arrived = 0, active = 0, scheduled = 0, totalW = 0, delaySum = 0, entered = 0
    for (const t of this.trains) {
      if (t.state === 'ARRIVED') arrived++
      else if (t.state === 'SCHEDULED') scheduled++
      else active++
      if (t.state !== 'SCHEDULED') {
        entered++
        delaySum += t.delaySec
        totalW += t.delaySec * classWeight(t.def.cls)
      }
    }
    let occupied = 0, total = 0
    for (const e of this.corridor.edges) {
      const dirs: Direction[] = e.tracks === 1 ? ['UP'] : ['UP', 'DOWN']
      for (const d of dirs)
        for (let i = 0; i < e.blocks; i++) {
          total++
          if (this.blocks.get(this.blockKey(e, d, i))) occupied++
        }
    }
    const hours = this.simSec / 3600
    return {
      simSec: this.simSec,
      arrived,
      active,
      scheduled,
      totalWeightedDelaySec: Math.round(totalW),
      avgDelaySec: entered ? Math.round(delaySum / entered) : 0,
      conflictsResolved: this.conflictsResolved,
      throughputPerHour: hours > 0 ? +(arrived / hours).toFixed(1) : 0,
      capacityUtilPct: total ? Math.round((occupied / total) * 100) : 0,
      unsafeAdmissionsPrevented: this.unsafePrevented,
    }
  }

  private renderPos(t: Train): RenderPos {
    if (t.pos.kind === 'station') return { kind: 'station', stationId: t.pos.stationId, onLoop: t.pos.onLoop }
    const e = this.index.edgeById.get(t.pos.edgeId)!
    return { kind: 'edge', edgeId: e.id, frac: Math.max(0, Math.min(1, t.pos.offsetKm / e.lengthKm)), dir: t.pos.dir }
  }

  /** Test/inspection hook: every block section currently holding a train. */
  occupiedBlocks(): { key: string; trainId: string }[] {
    const out: { key: string; trainId: string }[] = []
    for (const [key, trainId] of this.blocks) if (trainId) out.push({ key, trainId })
    return out
  }

  view(): SimView {
    return { index: this.index, corridor: this.corridor, trains: this.trains, edgeLockDir: this.edgeLockDir, isBlocked: this.isBlocked }
  }

  snapshot(): Snapshot {
    const trains: TrainView[] = this.trains.map((t) => ({
      id: t.def.id,
      number: t.def.number,
      name: t.def.name,
      cls: t.def.cls,
      direction: t.def.direction,
      state: t.state,
      pos: this.renderPos(t),
      speedKmh: Math.round(t.speedKmh),
      delaySec: Math.round(t.delaySec),
      heldReason: t.heldReason,
      destCode: this.code(t.def.exitStationId),
    }))
    const blockedEdgeIds = this.corridor.edges.filter((e) => this.isBlocked(e.id)).map((e) => e.id)
    return {
      simSec: this.simSec,
      policy: this.policy,
      trains,
      kpis: this.kpis(),
      decisions: this.decisions.slice(0, 30),
      conflicts: predictConflicts(this.view(), this.simSec),
      events: this.events.slice(0, 30),
      blockedEdgeIds,
    }
  }
}
