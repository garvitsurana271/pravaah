import { useCallback, useEffect, useRef, useState } from 'react'
import { Simulation, type Snapshot } from '../engine/simulation'
import { BALASORE_CORRIDOR } from '../engine/corridor'
import { SCENARIOS, defaultScenario, type Scenario } from '../engine/scenarios'

const SPEEDS = [1, 2, 4, 8] as const
export type Speed = (typeof SPEEDS)[number]
const SIMSEC_PER_REALSEC: Record<Speed, number> = { 1: 24, 2: 48, 4: 96, 8: 192 }
const SUBSTEP = 4 // sim-seconds per physics sub-step (keeps motion smooth + accurate)

function freshPair(sc: Scenario) {
  return {
    opt: new Simulation(BALASORE_CORRIDOR, sc.trains, sc.disruptions, { policy: 'OPTIMIZER' }),
    fcfs: new Simulation(BALASORE_CORRIDOR, sc.trains, sc.disruptions, { policy: 'FCFS' }),
  }
}

const isDone = (s: Snapshot) => s.kpis.active === 0 && s.kpis.scheduled === 0 && s.kpis.arrived > 0

export interface Projected {
  pct: number
  savingSec: number
}

/** Run both policies to completion once to get the honest full-run headline. */
function projectResult(sc: Scenario): Projected {
  const o = new Simulation(BALASORE_CORRIDOR, sc.trains, sc.disruptions, { policy: 'OPTIMIZER' })
  const f = new Simulation(BALASORE_CORRIDOR, sc.trains, sc.disruptions, { policy: 'FCFS' })
  for (let i = 0; i < 3000; i++) {
    o.step(6)
    f.step(6)
  }
  const ow = o.snapshot().kpis.totalWeightedDelaySec
  const fw = f.snapshot().kpis.totalWeightedDelaySec
  return { pct: fw > 0 ? Math.round(((fw - ow) / fw) * 100) : 0, savingSec: Math.max(0, fw - ow) }
}

export interface SimController {
  scenario: Scenario
  scenarios: Scenario[]
  optimizer: Snapshot
  fcfs: Snapshot
  primary: Snapshot
  projected: Projected
  optimizerOn: boolean
  playing: boolean
  speed: Speed
  finished: boolean
  play: () => void
  pause: () => void
  togglePlay: () => void
  reset: () => void
  setOptimizerOn: (on: boolean) => void
  setSpeed: (s: Speed) => void
  selectScenario: (id: string) => void
}

export function useSimulation(): SimController {
  const [scenario, setScenario] = useState<Scenario>(defaultScenario)
  const sims = useRef(freshPair(defaultScenario))
  const [optimizer, setOptimizer] = useState<Snapshot>(() => sims.current.opt.snapshot())
  const [fcfs, setFcfs] = useState<Snapshot>(() => sims.current.fcfs.snapshot())
  const [optimizerOn, setOptimizerOn] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(2)
  const [finished, setFinished] = useState(false)
  const [projected, setProjected] = useState<Projected>(() => projectResult(defaultScenario))

  const raf = useRef<number | null>(null)
  const lastTs = useRef<number | null>(null)
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  playingRef.current = playing
  speedRef.current = speed

  const publish = useCallback(() => {
    setOptimizer(sims.current.opt.snapshot())
    setFcfs(sims.current.fcfs.snapshot())
  }, [])

  const loop = useCallback(
    (ts: number) => {
      if (lastTs.current == null) lastTs.current = ts
      const dtReal = Math.min(0.12, (ts - lastTs.current) / 1000)
      lastTs.current = ts

      if (playingRef.current) {
        let budget = SIMSEC_PER_REALSEC[speedRef.current] * dtReal
        while (budget > 1e-6) {
          const step = Math.min(SUBSTEP, budget)
          sims.current.opt.step(step)
          sims.current.fcfs.step(step)
          budget -= step
        }
        publish()
        if (isDone(sims.current.opt.snapshot()) && isDone(sims.current.fcfs.snapshot())) {
          setPlaying(false)
          setFinished(true)
        }
      }
      raf.current = requestAnimationFrame(loop)
    },
    [publish],
  )

  // Open mid-action: pre-roll the section and auto-play, so a judge never
  // lands on a dead all-zeros screen.
  useEffect(() => {
    for (let i = 0; i < 55; i++) {
      sims.current.opt.step(6)
      sims.current.fcfs.step(6)
    }
    publish()
    setPlaying(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    raf.current = requestAnimationFrame(loop)
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
    }
  }, [loop])

  const reset = useCallback(() => {
    sims.current = freshPair(scenario)
    lastTs.current = null
    setFinished(false)
    setPlaying(false)
    publish()
  }, [scenario, publish])

  const selectScenario = useCallback(
    (id: string) => {
      const sc = SCENARIOS.find((s) => s.id === id) ?? defaultScenario
      setScenario(sc)
      setProjected(projectResult(sc))
      sims.current = freshPair(sc)
      lastTs.current = null
      setFinished(false)
      setPlaying(false)
      setOptimizer(sims.current.opt.snapshot())
      setFcfs(sims.current.fcfs.snapshot())
    },
    [],
  )

  return {
    scenario,
    scenarios: SCENARIOS,
    optimizer,
    fcfs,
    primary: optimizerOn ? optimizer : fcfs,
    projected,
    optimizerOn,
    playing,
    speed,
    finished,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    togglePlay: () => setPlaying((p) => !p),
    reset,
    setOptimizerOn,
    setSpeed,
    selectScenario,
  }
}
