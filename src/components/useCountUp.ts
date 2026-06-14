import { useEffect, useRef, useState } from 'react'

// Eases a number to its target (ease-out cubic). Counts up from 0 on mount,
// then glides to each new target. Drives the hero metric's count-up.
export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  const raf = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - k, 3)
      setVal(from + (target - from) * e)
      if (k < 1) raf.current = requestAnimationFrame(step)
      else fromRef.current = target
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return val
}
