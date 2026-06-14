import { describe, it, expect } from 'vitest'
import { Simulation, type Policy, type Snapshot } from './simulation'
import { BALASORE_CORRIDOR, buildIndex } from './corridor'
import { SCENARIOS } from './scenarios'
import { resolveContention, type Candidate, type DispatchContext } from './dispatcher'
import { classWeight } from './priorities'
import { explainDecision, buildLookup } from './explain'
import type { Edge, Train, TrainDef } from './types'

const index = buildIndex(BALASORE_CORRIDOR)
const scenarioById = (id: string) => SCENARIOS.find((s) => s.id === id)!

interface RunResult {
  sim: Simulation
  last: Snapshot
  blockViolations: number
  headOnViolations: number
  ticks: number
}

function run(policy: Policy, scenarioId: string, maxTicks = 6000): RunResult {
  const sc = scenarioById(scenarioId)
  const sim = new Simulation(BALASORE_CORRIDOR, sc.trains, sc.disruptions, { policy })
  let blockViolations = 0
  let headOnViolations = 0
  let ticks = 0
  for (let i = 0; i < maxTicks; i++) {
    sim.step(sc.tickSec)
    ticks++
    // INVARIANT 1: each running train owns exactly one block; no block shared.
    const occ = sim.occupiedBlocks()
    const running = sim.snapshot().trains.filter((t) => t.state === 'RUNNING').length
    const seen = new Set(occ.map((o) => o.trainId))
    if (occ.length !== running || seen.size !== occ.length) blockViolations++
    // INVARIANT 2: no single-line edge ever carries both directions at once.
    const byEdge = new Map<string, Set<string>>()
    for (const t of sim.snapshot().trains) {
      if (t.pos.kind !== 'edge') continue
      const e = index.edgeById.get(t.pos.edgeId!)!
      if (e.tracks !== 1) continue
      if (!byEdge.has(e.id)) byEdge.set(e.id, new Set<string>())
      byEdge.get(e.id)!.add(t.pos.dir!)
    }
    for (const dirs of byEdge.values()) if (dirs.size > 1) headOnViolations++

    const k = sim.snapshot().kpis
    if (k.active === 0 && k.scheduled === 0 && k.arrived > 0) break
  }
  return { sim, last: sim.snapshot(), blockViolations, headOnViolations, ticks }
}

describe('interlocking safety invariants', () => {
  for (const policy of ['OPTIMIZER', 'FCFS'] as Policy[]) {
    it(`never puts two trains in one block (${policy}, peak)`, () => {
      const r = run(policy, 'peak')
      expect(r.blockViolations).toBe(0)
    })
    it(`never allows a single-line head-on (${policy}, peak)`, () => {
      const r = run(policy, 'peak')
      expect(r.headOnViolations).toBe(0)
    })
  }
})

describe('no deadlock — every train completes', () => {
  for (const policy of ['OPTIMIZER', 'FCFS'] as Policy[]) {
    it(`all trains arrive (${policy}, peak)`, () => {
      const r = run(policy, 'peak')
      expect(r.last.kpis.arrived).toBe(scenarioById('peak').trains.length)
      expect(r.last.kpis.active).toBe(0)
    })
  }
  it('all trains arrive even through a section failure (recovery)', () => {
    const r = run('OPTIMIZER', 'recovery')
    expect(r.last.kpis.arrived).toBe(scenarioById('recovery').trains.length)
  })
})

describe('the optimizer beats first-come-first-served', () => {
  it('cuts total weighted delay on the peak scenario', () => {
    const opt = run('OPTIMIZER', 'peak')
    const fcfs = run('FCFS', 'peak')
    // The whole pitch in one assertion: priority-aware dispatch loses fewer
    // weighted train-minutes than the manual FCFS status quo.
    expect(opt.last.kpis.totalWeightedDelaySec).toBeLessThan(fcfs.last.kpis.totalWeightedDelaySec)
  })
})

describe('the safety floor refuses unsafe admissions', () => {
  it('blocks the Balasore-style route onto an occupied line', () => {
    const r = run('OPTIMIZER', 'safety')
    expect(r.last.kpis.unsafeAdmissionsPrevented).toBeGreaterThanOrEqual(1)
    expect(r.sim.decisions.some((d) => d.kind === 'SAFETY_REFUSAL')).toBe(true)
  })
})

// ── focused unit tests ──────────────────────────────────────────────────────

function fakeTrain(id: string, number: string, cls: TrainDef['cls'], maxSpeedKmh: number): Train {
  const def: TrainDef = {
    id, number, name: number, cls, direction: 'UP',
    entryStationId: 'bst', exitStationId: 'soro', entrySec: 0, dueSec: 0, maxSpeedKmh, stops: [],
  }
  return {
    def, state: 'DWELL', pos: { kind: 'station', stationId: 'bst', onLoop: false },
    speedKmh: 0, pathIdx: 0, path: ['bst', 'soro'], delaySec: 0, enteredSec: null, arrivedSec: null,
    heldReason: null, heldSec: 0,
  }
}

const ctx: DispatchContext = {
  index,
  weightOf: (t) => classWeight(t.def.cls),
  estimateClearSec: (edge: Edge, t) => (edge.lengthKm / Math.min(t.def.maxSpeedKmh, edge.maxSpeedKmh)) * 3600,
  loopFreeAt: () => true,
}

describe('dispatcher precedence', () => {
  const edge = index.edgeById.get('bst-soro')!

  it('OPTIMIZER clears the Superfast ahead of an earlier goods', () => {
    const goods = fakeTrain('g', 'NRG7', 'GOODS', 65)
    const sf = fakeTrain('s', '12841', 'SUPERFAST', 130)
    const candidates: Candidate[] = [
      { train: goods, readySec: 0 }, // goods is ready first…
      { train: sf, readySec: 60 },
    ]
    const res = resolveContention('OPTIMIZER', edge, candidates, ctx)
    expect(res.order[0]).toBe('s') // …but the optimizer still sends the Superfast
  })

  it('FCFS clears the earlier train regardless of class', () => {
    const goods = fakeTrain('g', 'NRG7', 'GOODS', 65)
    const sf = fakeTrain('s', '12841', 'SUPERFAST', 130)
    const candidates: Candidate[] = [
      { train: goods, readySec: 0 },
      { train: sf, readySec: 60 },
    ]
    const res = resolveContention('FCFS', edge, candidates, ctx)
    expect(res.order[0]).toBe('g')
  })
})

describe('glass-box explanation', () => {
  it('produces a grounded, human-readable rationale for a real decision', () => {
    const r = run('OPTIMIZER', 'peak')
    const decision = r.sim.decisions.find((d) => d.kind === 'CROSS' || d.kind === 'PRECEDENCE')
    expect(decision).toBeTruthy()
    const lookup = buildLookup(r.last.trains)
    const exp = explainDecision(decision!, lookup)
    expect(exp.headline.length).toBeGreaterThan(0)
    expect(exp.rationale.length).toBeGreaterThan(1)
  })
})
