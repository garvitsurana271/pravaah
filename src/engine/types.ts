// ─────────────────────────────────────────────────────────────────────────
// Pravaah domain model.
//
// A corridor is a linear chain of stations joined by edges. Each edge is
// either single-line (one shared running line, both directions) or
// double-line (a dedicated line per direction). Every edge is divided into
// fixed block sections — the railway safety unit: at most ONE train per block.
// Single-line edges additionally carry a direction lock so two trains can
// never be sent head-on into the same line. These rules are the interlocking;
// they hold no matter which dispatch policy is running.
// ─────────────────────────────────────────────────────────────────────────

export type Direction = 'UP' | 'DOWN'

/** UP runs in the direction of increasing chainage (km); DOWN decreasing. */
export const opposite = (d: Direction): Direction => (d === 'UP' ? 'DOWN' : 'UP')

export type TrainClass =
  | 'SPECIAL' // Rajdhani / Vande Bharat / relief — highest precedence
  | 'SUPERFAST'
  | 'MAIL'
  | 'EXPRESS'
  | 'PASSENGER'
  | 'GOODS'

export type TrainState =
  | 'SCHEDULED' // not yet entered the corridor
  | 'RUNNING' // moving on an edge
  | 'DWELL' // making a scheduled commercial halt at a station
  | 'HELD' // held by the dispatcher (looped) to resolve a conflict
  | 'ARRIVED' // left the corridor at its exit

export interface Station {
  id: string
  code: string
  name: string
  km: number // chainage along the corridor
  lat: number
  lon: number
  /** Number of loop/refuge lines (besides the running line) a train can be held on. */
  loopLines: number
  isJunction: boolean
}

export interface Edge {
  id: string
  fromId: string // station at the lower km
  toId: string // station at the higher km
  lengthKm: number
  tracks: 1 | 2 // 1 = single-line (shared), 2 = double-line (one per direction)
  blocks: number // number of block sections the edge is divided into
  maxSpeedKmh: number
}

export interface Corridor {
  name: string
  subtitle: string
  stations: Station[]
  edges: Edge[]
}

/** A train as authored in a scenario. */
export interface TrainDef {
  id: string
  number: string
  name: string
  cls: TrainClass
  direction: Direction
  entryStationId: string
  exitStationId: string
  /** Seconds after sim start when the train is ready to enter the corridor. */
  entrySec: number
  /** Seconds after sim start the train is *scheduled* to clear its exit. */
  dueSec: number
  maxSpeedKmh: number
  /** Station ids where the train makes a scheduled commercial halt. */
  stops: string[]
}

/** Where a train physically is. */
export type Position =
  | { kind: 'station'; stationId: string; onLoop: boolean }
  | { kind: 'edge'; edgeId: string; dir: Direction; offsetKm: number }

export interface Train {
  def: TrainDef
  state: TrainState
  pos: Position
  speedKmh: number
  /** Index of the next station the train is heading to, within its path. */
  pathIdx: number
  path: string[] // ordered station ids from entry to exit
  delaySec: number // current lateness vs schedule (can be negative = early)
  enteredSec: number | null
  arrivedSec: number | null
  heldReason: string | null
  /** Cumulative seconds this train has spent HELD by the dispatcher. */
  heldSec: number
}

// ── Dispatcher decision trace (what the glass-box explains) ────────────────

export type DecisionKind =
  | 'CROSS' // single-line crossing: opposing trains, who enters first
  | 'PRECEDENCE' // same-direction: who goes first / who is looped to be overtaken
  | 'HOLD' // a train held to keep a block/section clear
  | 'PROCEED' // explicitly cleared to proceed (no contender)
  | 'SAFETY_REFUSAL' // interlocking refused an unsafe admission (e.g. occupied loop)

export interface DecisionOption {
  /** The train ids in the order they would be served. */
  order: string[]
  /** Added delay this ordering imposes, per train id (seconds). */
  addedDelaySec: Record<string, number>
  /** Σ addedDelay × priority weight — the objective the optimizer minimises. */
  weightedCostSec: number
  feasible: boolean
  /** If infeasible, why (e.g. would deadlock — no refuge for the waiting train). */
  infeasibleReason?: string
}

export interface Decision {
  id: string
  atSec: number
  kind: DecisionKind
  policy: 'OPTIMIZER' | 'FCFS'
  stationId: string
  resourceId: string // edge or station the contention is over
  trainIds: string[]
  options: DecisionOption[]
  chosenOrder: string[]
  reason: string // plain-language rationale (the glass-box output)
  safetyNote?: string
}

// ── Predicted conflicts (shown on the board before they bite) ──────────────

export type ConflictKind = 'HEAD_ON' | 'FOLLOWING' | 'JUNCTION' | 'OCCUPIED_LOOP'

export interface Conflict {
  id: string
  kind: ConflictKind
  resourceId: string
  trainIds: string[]
  etaSec: number // seconds until the contention materialises
  severity: 'INFO' | 'WARN' | 'CRITICAL'
}

// ── Disruptions (scenario-injected perturbations) ──────────────────────────

export type Disruption =
  | { atSec: number; kind: 'BLOCK_EDGE'; edgeId: string; forSec: number; note: string }
  | { atSec: number; kind: 'DELAY_TRAIN'; trainId: string; bySec: number; note: string }
  | {
      // A mis-set route attempts to admit a train onto an already-occupied
      // line (the Balasore failure mode). The interlocking must refuse it.
      atSec: number
      kind: 'UNSAFE_ROUTE_ATTEMPT'
      trainId: string
      edgeId: string
      note: string
    }

export interface Kpis {
  simSec: number
  arrived: number
  active: number
  scheduled: number
  totalWeightedDelaySec: number
  avgDelaySec: number
  conflictsResolved: number
  throughputPerHour: number
  capacityUtilPct: number
  unsafeAdmissionsPrevented: number
}
