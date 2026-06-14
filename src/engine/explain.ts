import type { Decision, TrainClass } from './types'
import { CLASS_META, CLASS_WEIGHT } from './priorities'
import type { TrainView } from './simulation'

// ─────────────────────────────────────────────────────────────────────────
// The glass box. Every dispatcher decision carries a structured trace; here we
// turn that trace into auditable, plain-language reasoning a section
// controller could read and trust — grounded entirely in the solver's own
// numbers (added-delay, priority weights), never invented.
// ─────────────────────────────────────────────────────────────────────────

export interface TrainLite {
  number: string
  name: string
  cls: TrainClass
  delaySec: number
}

export function buildLookup(trains: TrainView[]): Map<string, TrainLite> {
  return new Map(trains.map((t) => [t.id, { number: t.number, name: t.name, cls: t.cls, delaySec: t.delaySec }]))
}

export interface Explanation {
  headline: string
  rationale: string[]
  safety?: string
}

const mins = (sec: number) => (sec / 60).toFixed(1)

export function explainDecision(d: Decision, lookup: Map<string, TrainLite>): Explanation {
  const name = (id: string) => lookup.get(id)?.number ?? id
  const cls = (id: string) => lookup.get(id)?.cls ?? 'GOODS'
  const clsLabel = (id: string) => CLASS_META[cls(id)].label

  if (d.kind === 'SAFETY_REFUSAL') {
    const t = d.trainIds[0]
    return {
      headline: `Interlocking refused an unsafe admission for ${name(t)}`,
      rationale: [
        `A route was set that would have admitted ${name(t)} into section ${d.resourceId.toUpperCase()} while it was still occupied.`,
        `This is the Balasore failure mode — a train sent onto a line that is not clear.`,
        `Pravaah's interlocking floor rejected the admission outright and held ${name(t)} at the home signal. No dispatch policy can override this.`,
      ],
      safety: d.safetyNote,
    }
  }

  const lead = d.chosenOrder[0]
  const held = d.chosenOrder.slice(1)
  const chosen = d.options.find((o) => sameOrder(o.order, d.chosenOrder)) ?? d.options[0]
  const alt = d.options.find((o) => !sameOrder(o.order, d.chosenOrder))

  const situation =
    d.kind === 'CROSS'
      ? `Opposing trains are converging on single-line section ${d.resourceId.toUpperCase()}; only one may hold the line at a time.`
      : `Trains are queued for the same line out of ${d.stationId.toUpperCase()}; precedence must be set.`

  const rationale: string[] = [situation]

  for (const id of d.chosenOrder) {
    const w = CLASS_WEIGHT[cls(id)]
    const add = chosen.addedDelaySec[id] ?? 0
    const role = id === lead ? 'cleared to proceed' : `held ${mins(add)} min`
    rationale.push(`${name(id)} — ${clsLabel(id)} (priority ×${w}) → ${role}.`)
  }

  if (alt) {
    const factor = chosen.weightedCostSec > 0 ? (alt.weightedCostSec / Math.max(1, chosen.weightedCostSec)) : 1
    const saving = alt.weightedCostSec - chosen.weightedCostSec
    if (saving > 0) {
      rationale.push(
        `Reversing the order (clear ${name(alt.order[0])} first) would cost ${mins(alt.weightedCostSec)} weighted-min against ${mins(chosen.weightedCostSec)} chosen — ${factor.toFixed(1)}× worse, because holding the higher-priority train multiplies the lost minutes.`,
      )
    }
  }

  const headline =
    held.length > 0
      ? `Cleared ${name(lead)} (${CLASS_META[cls(lead)].short}); held ${held.map(name).join(', ')}`
      : `Cleared ${name(lead)} to proceed`

  return { headline, rationale }
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

// ── Conversational copilot (deterministic, offline) ────────────────────────

export interface CopilotAnswer {
  text: string
  refDecisionId?: string
}

/**
 * Answer free-text questions about the live state using the decision trace —
 * no network call, so the demo never depends on an external model.
 */
export function answerQuestion(
  question: string,
  trains: TrainView[],
  decisions: Decision[],
  kpis: { unsafeAdmissionsPrevented: number; conflictsResolved: number; totalWeightedDelaySec: number },
): CopilotAnswer {
  const q = question.toLowerCase().trim()
  const lookup = buildLookup(trains)

  // resolve a referenced train by number or name fragment
  const token = q.match(/\b\d{4,5}\b/)?.[0]
  const ref =
    trains.find((t) => token && t.number.includes(token)) ??
    trains.find((t) => q.includes(t.name.toLowerCase().split(' ')[0]) && t.name.length > 3)

  const isSafety = /safe|collision|crash|unsafe|interlock|refus/.test(q)
  const isOverride = /override|what if|reverse|instead|ignore/.test(q)
  const isWhy = /why|reason|explain|justif/.test(q)
  const isDelay = /delay|late|hold|held|wait/.test(q)

  if (isSafety && !ref) {
    return {
      text: `Safety floor is active. The interlocking has refused ${kpis.unsafeAdmissionsPrevented} unsafe admission(s) this run — every one a potential collision blocked before it could happen. No two trains can ever occupy the same block, and single-line sections are direction-locked. This guarantee holds regardless of the dispatch policy.`,
    }
  }

  if (ref) {
    const d = decisions.find((x) => x.trainIds.includes(ref.id))
    if (d && (isWhy || isDelay || isOverride || true)) {
      const exp = explainDecision(d, lookup)
      if (isOverride && d.options.length > 1) {
        const chosen = d.options.find((o) => sameOrder(o.order, d.chosenOrder))!
        const alt = d.options.find((o) => !sameOrder(o.order, d.chosenOrder))!
        const extra = (alt.weightedCostSec - chosen.weightedCostSec) / 60
        return {
          refDecisionId: d.id,
          text: `If you override and reverse precedence for ${ref.number}, total weighted delay rises by about ${extra.toFixed(1)} weighted-min — you'd be holding a higher-priority service to favour a lower one. You can do it (human-in-the-loop), but here's the cost so the call is yours, not the machine's.`,
        }
      }
      return { refDecisionId: d.id, text: `${exp.headline}. ${exp.rationale.slice(0, 3).join(' ')}` }
    }
    const st = ref.state.toLowerCase()
    const late = ref.delaySec > 30 ? ` It has lost ${mins(ref.delaySec)} min so far.` : ' It is on time.'
    return { text: `${ref.number} (${CLASS_META[ref.cls].label}) is currently ${st}, bound for ${ref.destCode}.${late} No open dispatch decision references it right now.` }
  }

  // general status
  return {
    text: `Right now: ${kpis.conflictsResolved} conflicts resolved, ${kpis.unsafeAdmissionsPrevented} unsafe admissions refused, total weighted delay ${mins(kpis.totalWeightedDelaySec)} weighted-min. Ask me "why is 12841 held?", "what if I override 12863?", or "is the section safe?".`,
  }
}
