import type { Corridor, Direction, Edge, Station } from './types'

// ─────────────────────────────────────────────────────────────────────────
// A representative congested corridor modelled on the South Eastern Railway
// section around Bahanaga Bazar / Balasore (Odisha) — the site of the 2 June
// 2023 triple-train tragedy. Station names and approximate coordinates are
// real; the track layout (which sections are single vs double line, loop
// counts, block lengths) is a REPRESENTATIVE model of a mixed-capacity
// section, not a claim about current doubling status. It exists to exercise
// the dispatcher with realistic crossings, overtakes and loop conflicts.
// ─────────────────────────────────────────────────────────────────────────

const station = (
  id: string,
  code: string,
  name: string,
  km: number,
  lat: number,
  lon: number,
  loopLines: number,
  isJunction = false,
): Station => ({ id, code, name, km, lat, lon, loopLines, isJunction })

const STATIONS: Station[] = [
  station('kgp', 'KGP', 'Kharagpur Jn', 0, 22.339, 87.325, 4, true),
  station('jer', 'JER', 'Jaleswar', 22, 21.802, 87.227, 2),
  station('bst', 'BST', 'Basta', 38, 21.704, 87.151, 2),
  station('soro', 'SORO', 'Soro', 55, 21.531, 86.998, 2),
  station('bnbr', 'BNBR', 'Bahanaga Bazar', 70, 21.405, 86.882, 3),
  station('bls', 'BLS', 'Balasore', 85, 21.494, 86.933, 4, true),
  station('rupsa', 'RUPSA', 'Rupsa Jn', 103, 21.281, 86.804, 3, true),
  station('bhc', 'BHC', 'Bhadrak', 122, 21.057, 86.515, 4, true),
]

// from = lower km, to = higher km. tracks: 1 single-line, 2 double-line.
const edge = (
  fromId: string,
  toId: string,
  lengthKm: number,
  tracks: 1 | 2,
  maxSpeedKmh: number,
): Edge => ({
  id: `${fromId}-${toId}`,
  fromId,
  toId,
  lengthKm,
  tracks,
  // Single-line sections work as ONE absolute-block unit between crossing
  // stations (one train at a time, either direction). Double lines are
  // subdivided so same-direction trains can follow under block spacing.
  blocks: tracks === 1 ? 1 : Math.max(2, Math.round(lengthKm / 4)),
  maxSpeedKmh,
})

const EDGES: Edge[] = [
  edge('kgp', 'jer', 22, 2, 130),
  edge('jer', 'bst', 16, 2, 120),
  edge('bst', 'soro', 17, 1, 100), // single-line: trains must cross at stations
  edge('soro', 'bnbr', 15, 1, 100), // single-line through the accident section
  edge('bnbr', 'bls', 15, 2, 120),
  edge('bls', 'rupsa', 18, 2, 110),
  edge('rupsa', 'bhc', 19, 1, 95), // single-line branch-grade section
]

export const BALASORE_CORRIDOR: Corridor = {
  name: 'Kharagpur – Bhadrak',
  subtitle: 'South Eastern Railway · Bahanaga Bazar / Balasore section',
  stations: STATIONS,
  edges: EDGES,
}

// ── Pure geometry helpers ──────────────────────────────────────────────────

export function buildIndex(c: Corridor) {
  const stationById = new Map(c.stations.map((s) => [s.id, s]))
  const edgeById = new Map(c.edges.map((e) => [e.id, e]))
  const orderById = new Map(c.stations.map((s, i) => [s.id, i]))
  return { stationById, edgeById, orderById }
}

export type CorridorIndex = ReturnType<typeof buildIndex>

/** The edge directly connecting two adjacent stations, in either order. */
export function edgeBetween(idx: CorridorIndex, aId: string, bId: string): Edge | undefined {
  return idx.edgeById.get(`${aId}-${bId}`) ?? idx.edgeById.get(`${bId}-${aId}`)
}

/** Direction of travel when going from station a to adjacent station b. */
export function travelDir(idx: CorridorIndex, aId: string, bId: string): Direction {
  return (idx.orderById.get(bId)! > idx.orderById.get(aId)!) ? 'UP' : 'DOWN'
}

/** Ordered list of station ids from entry to exit (inclusive). */
export function pathBetween(c: Corridor, idx: CorridorIndex, entryId: string, exitId: string): string[] {
  const a = idx.orderById.get(entryId)!
  const b = idx.orderById.get(exitId)!
  const slice = c.stations.slice(Math.min(a, b), Math.max(a, b) + 1).map((s) => s.id)
  return a <= b ? slice : slice.reverse()
}

export const totalKm = (c: Corridor) => c.stations[c.stations.length - 1].km - c.stations[0].km
