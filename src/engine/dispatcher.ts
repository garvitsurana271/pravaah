import type { Decision, DecisionOption, Edge, Train } from './types'
import type { CorridorIndex } from './corridor'

// ─────────────────────────────────────────────────────────────────────────
// The dispatcher resolves a contention — several trains wanting the same
// single-line section or the same next edge — into an ORDER of service.
//
//   OPTIMIZER : minimise Σ (added-delay × priority-weight), over all feasible
//               orderings, with a short analytic look-ahead.
//   FCFS      : serve in arrival order, ignoring priority (the manual
//               control-room status quo we benchmark against).
//
// Safety is NOT decided here — the interlocking guarantees it upstream. The
// dispatcher only picks an order among options that are already safe.
// ─────────────────────────────────────────────────────────────────────────

export interface Candidate {
  train: Train
  /** When this train became ready to depart (for FCFS ordering). */
  readySec: number
}

export interface DispatchContext {
  index: CorridorIndex
  weightOf: (t: Train) => number
  /** Seconds for `t` to traverse `edge` and clear it for the next train. */
  estimateClearSec: (edge: Edge, t: Train) => number
  /** Can a train be refuged (looped) at this station while it waits? */
  loopFreeAt: (stationId: string) => boolean
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const out: T[][] = []
  arr.forEach((item, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) out.push([item, ...p])
  })
  return out
}

/** Cost of serving `order` on `edge`: cumulative wait × weight. */
function evaluate(order: Train[], edge: Edge, ctx: DispatchContext): DecisionOption {
  const addedDelaySec: Record<string, number> = {}
  let elapsed = 0
  let weightedCostSec = 0
  let feasible = true
  let infeasibleReason: string | undefined

  order.forEach((t, i) => {
    addedDelaySec[t.def.id] = Math.round(elapsed)
    weightedCostSec += elapsed * ctx.weightOf(t)
    // Everyone but the first served has to wait somewhere safe.
    if (i > 0) {
      const at = t.pos.kind === 'station' ? t.pos.stationId : t.path[t.pathIdx]
      if (!ctx.loopFreeAt(at)) {
        feasible = false
        infeasibleReason = `${t.def.number} has no free loop at ${at.toUpperCase()} to wait in`
      }
    }
    elapsed += ctx.estimateClearSec(edge, t)
  })

  return { order: order.map((t) => t.def.id), addedDelaySec, weightedCostSec: Math.round(weightedCostSec), feasible, infeasibleReason }
}

export interface Resolution {
  order: string[]
  options: DecisionOption[]
  reason: string
}

export function resolveContention(
  policy: 'OPTIMIZER' | 'FCFS',
  edge: Edge,
  candidates: Candidate[],
  ctx: DispatchContext,
): Resolution {
  const trains = candidates.map((c) => c.train)
  const perms = permutations(trains)
  const options = perms
    .map((p) => evaluate(p, edge, ctx))
    .sort((a, b) => a.weightedCostSec - b.weightedCostSec)

  // FCFS order: by readiness time, then by train number for determinism.
  const fcfsOrder = [...candidates]
    .sort((a, b) => a.readySec - b.readySec || a.train.def.number.localeCompare(b.train.def.number))
    .map((c) => c.train.def.id)

  if (policy === 'FCFS') {
    return {
      order: fcfsOrder,
      options,
      reason: 'First-come-first-served: the train that reached the section first proceeds, regardless of class or lateness.',
    }
  }

  // OPTIMIZER: cheapest feasible ordering (fall back to cheapest if none feasible).
  const best = options.find((o) => o.feasible) ?? options[0]
  const fcfsCost = options.find((o) => sameOrder(o.order, fcfsOrder))?.weightedCostSec
  const saving = fcfsCost != null ? fcfsCost - best.weightedCostSec : undefined

  const leadId = best.order[0]
  const lead = trains.find((t) => t.def.id === leadId)!
  const heldNumbers = best.order
    .slice(1)
    .map((id) => trains.find((t) => t.def.id === id)!.def.number)

  let reason = `Cleared ${lead.def.number} (${lead.def.cls.toLowerCase()}) first`
  if (heldNumbers.length) reason += `; held ${heldNumbers.join(', ')}`
  if (saving && saving > 0) reason += `. Saves ${Math.round(saving / 60)} weighted-min vs first-come-first-served`
  reason += '.'

  return { order: best.order, options, reason }
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

/** Build a Decision record from a resolution for the trace / glass-box. */
export function toDecision(
  idNum: number,
  atSec: number,
  policy: 'OPTIMIZER' | 'FCFS',
  stationId: string,
  edge: Edge,
  candidates: Candidate[],
  res: Resolution,
  kind: Decision['kind'],
): Decision {
  return {
    id: `D${idNum}`,
    atSec,
    kind,
    policy,
    stationId,
    resourceId: edge.id,
    trainIds: candidates.map((c) => c.train.def.id),
    options: res.options,
    chosenOrder: res.order,
    reason: res.reason,
  }
}
