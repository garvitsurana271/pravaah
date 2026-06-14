import { useCallback, useRef, useState } from 'react'
import type { SimController } from './useSimulation'

// A self-driving, captioned product tour. It calls the same controls a human
// would, so it can never desync from the real simulation — and it gives a solo
// judge (or a screen recording) the entire story in ~60 seconds, hands-free.

export interface TourCaption {
  text: string
  sub?: string
  tone: 'green' | 'blue' | 'red' | 'amber'
  index: number
  total: number
}

type Run = (ctl: SimController, setSel: (id: string | null) => void) => void
interface Step {
  text: string
  sub?: string
  tone: TourCaption['tone']
  holdMs: number
  run?: Run
}

function buildSteps(): Step[] {
  return [
    {
      text: 'Pravaah — live control of a congested section near Balasore.',
      sub: 'Eight trains, both directions, three single-line sections.',
      tone: 'blue',
      holdMs: 4400,
      run: (ctl, sel) => {
        sel(null)
        ctl.selectScenario('peak')
        ctl.setOptimizerOn(true)
        ctl.setSpeed(4)
      },
    },
    {
      text: 'The AI dispatcher resolves every crossing in real time.',
      sub: 'Minimising weighted delay across the whole section.',
      tone: 'green',
      holdMs: 8000,
      run: (ctl) => ctl.play(),
    },
    {
      text: 'Single-line sections lock to one direction — head-on conflicts are flagged before they bite.',
      tone: 'amber',
      holdMs: 6800,
    },
    {
      text: 'This is how it’s dispatched today: first-come, first-served.',
      sub: 'Watch the weighted-delay bar climb.',
      tone: 'blue',
      holdMs: 7600,
      run: (ctl) => ctl.setOptimizerOn(false),
    },
    {
      text: 'The AI cuts weighted delay ~20% — protecting premier trains, not just clearing them in order.',
      tone: 'green',
      holdMs: 7600,
      run: (ctl) => ctl.setOptimizerOn(true),
    },
    {
      text: 'And it explains every decision in plain language — grounded in the solver’s own numbers, not a black box.',
      tone: 'blue',
      holdMs: 8200,
      run: (ctl, sel) => {
        const held = ctl.primary.trains.find((t) => t.state === 'HELD')
        if (held) sel(held.id)
      },
    },
    {
      text: 'Now the 2 June 2023 Balasore failure, re-staged.',
      sub: 'A route is mis-set toward an already-occupied line.',
      tone: 'red',
      holdMs: 5600,
      run: (ctl, sel) => {
        sel(null)
        ctl.selectScenario('safety')
        ctl.setSpeed(8)
        ctl.play()
      },
    },
    {
      text: 'The interlocking REFUSES the admission. A collision — blocked before any AI even decides.',
      tone: 'red',
      holdMs: 8000,
    },
    {
      text: 'Open. Explainable. Safe by construction. This is Pravaah.',
      sub: 'github.com/garvitsurana271/pravaah',
      tone: 'green',
      holdMs: 6500,
      run: (ctl) => ctl.pause(),
    },
  ]
}

export function useTour(ctl: SimController, setSelectedId: (id: string | null) => void) {
  const [active, setActive] = useState(false)
  const [caption, setCaption] = useState<TourCaption | null>(null)
  const ctlRef = useRef(ctl)
  ctlRef.current = ctl
  const selRef = useRef(setSelectedId)
  selRef.current = setSelectedId
  const abortRef = useRef(false)
  const timer = useRef<number | null>(null)

  const wait = (ms: number) =>
    new Promise<void>((res) => {
      timer.current = window.setTimeout(res, ms)
    })

  const stop = useCallback(() => {
    abortRef.current = true
    if (timer.current) window.clearTimeout(timer.current)
    setActive(false)
    setCaption(null)
    ctlRef.current.pause()
  }, [])

  const start = useCallback(async () => {
    abortRef.current = false
    setActive(true)
    const steps = buildSteps()
    for (let i = 0; i < steps.length; i++) {
      if (abortRef.current) return
      steps[i].run?.(ctlRef.current, selRef.current)
      setCaption({ text: steps[i].text, sub: steps[i].sub, tone: steps[i].tone, index: i + 1, total: steps.length })
      await wait(steps[i].holdMs)
    }
    if (!abortRef.current) {
      setActive(false)
      setCaption(null)
      ctlRef.current.pause()
    }
  }, [])

  return { active, caption, start, stop }
}
