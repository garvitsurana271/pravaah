// Notional rush-hour start so the sim clock reads like a real control board.
const DAY_START = 6 * 3600

export function clock(simSec: number): string {
  const t = DAY_START + Math.floor(simSec)
  const h = Math.floor(t / 3600) % 24
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(h)}:${p(m)}:${p(s)}`
}

export const mins = (sec: number) => (sec / 60).toFixed(1)
export const minsInt = (sec: number) => Math.round(sec / 60)

export function signed(sec: number): string {
  if (sec <= 5) return 'on time'
  return `+${mins(sec)}m`
}
