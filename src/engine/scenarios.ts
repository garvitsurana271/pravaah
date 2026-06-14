import type { Disruption, TrainClass, TrainDef } from './types'

export interface Scenario {
  id: string
  title: string
  blurb: string
  /** Recommended sim-seconds advanced per real second at 1× (for the player). */
  tickSec: number
  trains: TrainDef[]
  disruptions: Disruption[]
}

let seq = 0
const T = (
  number: string,
  name: string,
  cls: TrainClass,
  from: string,
  to: string,
  entryMin: number,
  maxSpeedKmh: number,
  stops: string[] = ['bls'],
): TrainDef => {
  const dir = stationOrder(from) < stationOrder(to) ? 'UP' : 'DOWN'
  const entrySec = Math.round(entryMin * 60)
  return {
    id: `t${++seq}`,
    number,
    name,
    cls,
    direction: dir,
    entryStationId: from,
    exitStationId: to,
    entrySec,
    dueSec: entrySec + 3600,
    maxSpeedKmh,
    stops,
  }
}

const ORDER = ['kgp', 'jer', 'bst', 'soro', 'bnbr', 'bls', 'rupsa', 'bhc']
const stationOrder = (id: string) => ORDER.indexOf(id)

// ── Scenario 1 — Peak-hour single-line crossings (the throughput story) ─────
seq = 0
const peak: TrainDef[] = [
  T('NRG7', 'Iron-Ore Goods', 'GOODS', 'kgp', 'bhc', 0.5, 65, []),
  T('12841', 'Coromandel SF Express', 'SUPERFAST', 'kgp', 'bhc', 1, 130),
  T('NRG9', 'Steel Goods', 'GOODS', 'bhc', 'kgp', 1.5, 65, []),
  T('18045', 'East Coast Express', 'EXPRESS', 'bhc', 'kgp', 2, 110, ['rupsa', 'bls', 'soro']),
  T('22201', 'Puri–Sealdah Duronto', 'SPECIAL', 'bhc', 'kgp', 3.5, 130),
  T('58421', 'Cuttack Passenger', 'PASSENGER', 'kgp', 'bls', 5, 80, ['jer', 'bst', 'soro', 'bnbr']),
  T('12703', 'Falaknuma SF Express', 'SUPERFAST', 'kgp', 'bhc', 8, 130),
  T('12863', 'Howrah SF Express', 'SUPERFAST', 'bhc', 'kgp', 9, 125),
]

// ── Scenario 2 — Disruption recovery (a section fails mid-run) ───────────────
seq = 100
const recoveryTrains: TrainDef[] = [
  T('12841', 'Coromandel SF Express', 'SUPERFAST', 'kgp', 'bhc', 1, 130),
  T('NRG7', 'Iron-Ore Goods', 'GOODS', 'kgp', 'bhc', 0.5, 65, []),
  T('18045', 'East Coast Express', 'EXPRESS', 'bhc', 'kgp', 2, 110, ['bls']),
  T('22201', 'Puri–Sealdah Duronto', 'SPECIAL', 'bhc', 'kgp', 4, 130),
  T('58421', 'Cuttack Passenger', 'PASSENGER', 'kgp', 'bls', 3, 80, ['soro', 'bnbr']),
]
const recoveryDisruptions: Disruption[] = [
  { atSec: 540, kind: 'BLOCK_EDGE', edgeId: 'soro-bnbr', forSec: 600, note: 'Track obstruction reported in SORO–BNBR single-line section. Section blocked.' },
  { atSec: 300, kind: 'DELAY_TRAIN', trainId: 't101', bySec: 240, note: 'Coromandel SF held 4 min by late connection at Kharagpur.' },
]

// ── Scenario 3 — Balasore: the safety hold (interlocking refuses) ────────────
seq = 200
const safetyTrains: TrainDef[] = [
  // Goods starts ON the approach to the accident section so it occupies the
  // SORO–BNBR single line within the first minute.
  T('NRG7', 'Iron-Ore Goods', 'GOODS', 'soro', 'bhc', 0, 60, []),
  T('12841', 'Coromandel SF Express', 'SUPERFAST', 'bst', 'bhc', 1, 130),
  T('12863', 'Howrah SF Express', 'SUPERFAST', 'bhc', 'kgp', 3, 125),
]
const safetyDisruptions: Disruption[] = [
  {
    atSec: 150,
    kind: 'UNSAFE_ROUTE_ATTEMPT',
    trainId: 't202', // Coromandel SF
    edgeId: 'soro-bnbr',
    note: 'A route was mis-set toward the SORO–BNBR section while the Iron-Ore Goods still occupied it — the exact geometry of the 2 June 2023 Balasore disaster. The interlocking refused the admission.',
  },
]

export const SCENARIOS: Scenario[] = [
  {
    id: 'peak',
    title: 'Peak-Hour Crossings',
    blurb:
      'Eight trains, two directions, three single-line sections. Watch the optimizer trade priority against delay at every crossing — then flip it off and see first-come-first-served stall a Superfast behind a goods rake.',
    tickSec: 12,
    trains: peak,
    disruptions: [],
  },
  {
    id: 'recovery',
    title: 'Disruption Recovery',
    blurb:
      'Mid-run, the SORO–BNBR section fails and a Superfast arrives late. The dispatcher re-plans the surviving capacity in real time and narrates every move.',
    tickSec: 12,
    trains: recoveryTrains,
    disruptions: recoveryDisruptions,
  },
  {
    id: 'safety',
    title: 'Balasore: The Safety Hold',
    blurb:
      'The 2 June 2023 failure mode, re-staged: a route is mis-set toward an occupied line. Pravaah’s interlocking floor refuses the admission outright — a collision blocked before any AI even decides.',
    tickSec: 10,
    trains: safetyTrains,
    disruptions: safetyDisruptions,
  },
]

export const defaultScenario = SCENARIOS[0]
