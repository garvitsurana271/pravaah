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

export interface SimController {
  scenario: Scenario
  scenarios: Scenario[]
  optimizer: Snapshot
  fcfs: Snapshot
  primary: Snapshot
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
