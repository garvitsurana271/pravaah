import { useCallback, useRef, useState } from 'react'
import type { SimController } from './useSimulation'

// A self-driving, captioned product tour. It calls the same controls a human
// would, so it can never desync from the real simulation, and it gives a solo
// judge (or a screen recording) the whole story in about a minute, hands-free.

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
      text: 'Pravaah controls a busy stretch of track near Balasore.',
      sub: 'Eight real services, both directions, three single-line sections.',
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
      text: 'The AI decides who waits at each crossing, in real time, to keep total delay down.',
      tone: 'green',
      holdMs: 8000,
      run: (ctl) => ctl.play(),
    },
    {
      text: 'A single-line section carries one train at a time. The board flags a head-on risk before it becomes a problem.',
      tone: 'amber',
      holdMs: 6800,
    },
    {
      text: 'This is how it works today: first come, first served. Watch the delay bar climb.',
      tone: 'blue',
      holdMs: 7600,
      run: (ctl) => ctl.setOptimizerOn(false),
    },
    {
      text: 'Switch the AI back on. It cuts delay about 20 percent by giving priority trains a clear run.',
      tone: 'green',
      holdMs: 7600,
      run: (ctl) => ctl.setOptimizerOn(true),
    },
    {
      text: 'Every call comes with a plain reason, taken from the actual numbers the optimizer used. Ask it anything.',
      tone: 'blue',
      holdMs: 8200,
      run: (ctl, sel) => {
        const held = ctl.primary.trains.find((t) => t.state === 'HELD')
        if (held) sel(held.id)
      },
    },
    {
      text: 'Now the 2 June 2023 Balasore setup: a route is set toward a line that is already occupied.',
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
      text: 'The interlocking refuses it. The collision is blocked before the AI even gets to decide.',
      tone: 'red',
      holdMs: 8000,
    },
    {
      text: 'Open, explainable, and safe by design. That is Pravaah.',
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
