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

/**
 * Representative on-board passenger loadings per class, used only to translate
 * saved train-minutes into passenger-minutes for the impact headline. These are
 * order-of-magnitude figures from typical Indian Railways rake compositions
 * (e.g. a 16-coach Vande Bharat seats ~1,128; an unreserved passenger rake packs
 * far more), not a claim about any specific service. Goods carry none.
 */
export const CLASS_PAX: Record<TrainClass, number> = {
  SPECIAL: 1100,
  SUPERFAST: 1500,
  MAIL: 1800,
  EXPRESS: 1800,
  PASSENGER: 2400,
  GOODS: 0,
}

export const classPax = (cls: TrainClass) => CLASS_PAX[cls]
