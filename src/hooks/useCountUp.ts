import { useEffect, useState } from 'react'

export function useCountUp(target: number, start: boolean, durationMs: number): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) { setValue(0); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, start, durationMs])
  return value
}
