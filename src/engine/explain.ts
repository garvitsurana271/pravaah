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
        `This is the Balasore failure mode: a train sent onto a line that is not clear.`,
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
    rationale.push(`${name(id)}, ${clsLabel(id)} (priority weight ${w}): ${role}.`)
  }

  if (alt) {
    const factor = chosen.weightedCostSec > 0 ? (alt.weightedCostSec / Math.max(1, chosen.weightedCostSec)) : 1
    const saving = alt.weightedCostSec - chosen.weightedCostSec
    if (saving > 0) {
      rationale.push(
        `Clearing ${name(alt.order[0])} first instead would cost ${mins(alt.weightedCostSec)} weighted-min, versus ${mins(chosen.weightedCostSec)} for this plan. That is about ${factor.toFixed(1)} times worse, because holding the higher-priority train multiplies the minutes lost.`,
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
      text: `The safety floor is active. The interlocking has refused ${kpis.unsafeAdmissionsPrevented} unsafe admission(s) this run. Each one is a potential collision stopped before it could happen. No two trains can ever sit in the same block, and single-line sections are locked to one direction. That holds no matter which dispatch policy is running.`,
    }
  }

  // Which decision to talk about: the referenced train's, or — for a bare
  // "why this call" / "what if I override" — the most recent decision on the board.
  const d = ref
    ? decisions.find((x) => x.trainIds.includes(ref.id))
    : isWhy || isOverride || isDelay
      ? decisions.find((x) => x.kind !== 'PROCEED')
      : undefined

  if (d) {
    const exp = explainDecision(d, lookup)
    if (isOverride && d.options.length > 1) {
      const chosen = d.options.find((o) => sameOrder(o.order, d.chosenOrder))!
      const alt = d.options.find((o) => !sameOrder(o.order, d.chosenOrder))!
      const extra = (alt.weightedCostSec - chosen.weightedCostSec) / 60
      const lead = lookup.get(d.chosenOrder[0])?.number ?? d.chosenOrder[0]
      const held = d.chosenOrder.slice(1).map((id) => lookup.get(id)?.number ?? id).join(', ') || 'the held train'
      if (extra < 0.5) {
        return {
          refDecisionId: d.id,
          text: `At ${d.stationId.toUpperCase()}, ${lead} and ${held} are evenly matched, so letting ${held} go first costs almost no extra delay. This one is genuinely the controller's call, and you can make it.`,
        }
      }
      return {
        refDecisionId: d.id,
        text: `If you override and let ${held} go ahead of ${lead} at ${d.stationId.toUpperCase()}, total weighted delay rises by about ${extra.toFixed(1)} weighted-min. You would be holding a higher-priority service for a lower one. You can do it; the controller stays in charge, this is just the cost so the call is yours.`,
      }
    }
    return { refDecisionId: d.id, text: `${exp.headline}. ${exp.rationale.slice(0, 3).join(' ')}` }
  }

  if (ref) {
    const st = ref.state.toLowerCase()
    const late = ref.delaySec > 30 ? ` It has lost ${mins(ref.delaySec)} min so far.` : ' It is on time.'
    return { text: `${ref.number} (${CLASS_META[ref.cls].label}) is currently ${st}, bound for ${ref.destCode}.${late} No open dispatch decision references it right now.` }
  }

  // general status
  return {
    text: `Right now: ${kpis.conflictsResolved} conflicts resolved, ${kpis.unsafeAdmissionsPrevented} unsafe admissions refused, total weighted delay ${mins(kpis.totalWeightedDelaySec)} weighted-min. Try "why is 12801 held?", "what if I override 12896?", or "is the section safe?".`,
  }
}
