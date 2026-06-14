import type { TrainClass } from './types'

/**
 * Precedence weights. The optimizer minimises Σ (added-delay × weight), so a
 * minute lost by a Vande Bharat / Rajdhani costs far more than a minute lost
 * by a goods rake — which is exactly how a human section controller reasons.
 * These weights are a transparent policy knob, not a black box.
 */
export const CLASS_WEIGHT: Record<TrainClass, number> = {
  SPECIAL: 6,
  SUPERFAST: 5,
  MAIL: 4,
  EXPRESS: 3,
  PASSENGER: 2,
  GOODS: 1,
}

export interface ClassMeta {
  label: string
  short: string
  color: string // tailwind-ish hex for the board
}

export const CLASS_META: Record<TrainClass, ClassMeta> = {
  SPECIAL: { label: 'Special / Vande Bharat', short: 'SPL', color: '#c084fc' },
  SUPERFAST: { label: 'Superfast', short: 'SF', color: '#3aa0ff' },
  MAIL: { label: 'Mail', short: 'MAIL', color: '#22d3ee' },
  EXPRESS: { label: 'Express', short: 'EXP', color: '#22d37a' },
  PASSENGER: { label: 'Passenger', short: 'PASS', color: '#ffb02e' },
  GOODS: { label: 'Goods', short: 'GDS', color: '#9aa7bd' },
}

export const classWeight = (cls: TrainClass) => CLASS_WEIGHT[cls]
