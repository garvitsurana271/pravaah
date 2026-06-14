import { useMemo, useRef, useState, useEffect } from 'react'
import { Brain, Send, ShieldAlert, Sparkles } from 'lucide-react'
import type { Snapshot } from '../engine/simulation'
import type { Decision } from '../engine/types'
import { buildLookup, explainDecision, answerQuestion } from '../engine/explain'
import { clock, minsInt } from './format'

interface Msg {
  role: 'user' | 'ai'
  text: string
}

export function DispatcherPanel({
  snap,
  optimizerOn,
  selectedId,
}: {
  snap: Snapshot
  optimizerOn: boolean
  selectedId: string | null
}) {
  const lookup = useMemo(() => buildLookup(snap.trains), [snap.trains])
  const focus: Decision | undefined = useMemo(() => {
    if (selectedId) return snap.decisions.find((d) => d.trainIds.includes(selectedId)) ?? snap.decisions[0]
    return snap.decisions[0]
  }, [snap.decisions, selectedId])

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const scroller = useRef<HTMLDivElement>(null)

  const ask = (q: string) => {
    if (!q.trim()) return
    const a = answerQuestion(q, snap.trains, snap.decisions, snap.kpis)
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'ai', text: a.text }])
    setInput('')
  }

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <div className="panel-raised flex h-full flex-col overflow-hidden">
      <div className="border-b hairline px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink">
            <Brain size={15} className="text-signal-green" /> Glass-Box Dispatcher
          </span>
          <span className={`tabular rounded px-1.5 py-0.5 text-[9px] font-bold ${optimizerOn ? 'bg-signal-green/15 text-signal-green' : 'bg-muted/15 text-muted'}`}>
            {optimizerOn ? 'OPTIMIZER' : 'FCFS BASELINE'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-medium text-signal-green/80">Every dispatch decision in plain English. No black box.</div>
      </div>

      {/* Latest decision — the reasoning, grounded in the solver's own numbers */}
      <div className="border-b hairline px-3 py-2.5">
        {!focus ? (
          <div className="py-3 text-center text-[11px] text-muted/70">No dispatch decisions yet. Press Run to start the section.</div>
        ) : (
          <DecisionCard key={focus.id} d={focus} lookup={lookup} />
        )}
      </div>

      {/* Copilot */}
      <div className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted">
        <Sparkles size={13} className="text-signal-blue" /> Ask the dispatcher
      </div>
      <div ref={scroller} className="min-h-0 flex-1 space-y-2 overflow-auto px-3 pb-2">
        {messages.length === 0 && (
          <div className="rounded-lg bg-black/30 px-3 py-2 text-[11px] leading-relaxed text-muted">
            Each decision above is the optimizer's own working, written out in plain words. No black box. Ask why a train is held,
            whether the line is safe, or what an override would cost.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-1.5 text-[11px] leading-relaxed animate-rise ${
                m.role === 'user' ? 'bg-signal-blue/15 text-ink' : 'bg-black/40 text-muted'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t hairline px-2.5 py-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[
            selectedId ? `Why ${snap.trains.find((t) => t.id === selectedId)?.number ?? ''}?` : 'Why this call?',
            'Is the section safe?',
            'What if I override?',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => ask(chip)}
              className="cursor-pointer rounded-full border border-edge bg-black/30 px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-signal-blue/60 hover:text-ink"
            >
              {chip}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(input)
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. why is 12801 held?"
            aria-label="Ask the dispatcher"
            className="tabular min-w-0 flex-1 rounded-md border border-edge bg-black/40 px-2.5 py-1.5 text-[11px] text-ink placeholder:text-muted/50 focus:border-signal-blue/70 focus:outline-none"
          />
          <button type="submit" aria-label="Send" className="cursor-pointer rounded-md bg-signal-blue/20 p-1.5 text-signal-blue transition-colors hover:bg-signal-blue/30">
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}

function DecisionCard({ d, lookup }: { d: Decision; lookup: ReturnType<typeof buildLookup> }) {
  const exp = explainDecision(d, lookup)
  const isSafety = d.kind === 'SAFETY_REFUSAL'
  const chosen = d.options.find((o) => o.order.join() === d.chosenOrder.join())
  const maxCost = Math.max(1, ...d.options.map((o) => o.weightedCostSec))

  return (
    <div className="animate-rise">
      <div className="mb-1.5 flex items-center gap-2">
        {isSafety ? <ShieldAlert size={15} className="text-signal-red" /> : <span className="h-2 w-2 rounded-full bg-signal-green animate-blip" />}
        <span className={`text-[12px] font-semibold ${isSafety ? 'text-signal-red' : 'text-ink'}`}>{exp.headline}</span>
        <span className="tabular ml-auto text-[9px] text-muted/70">{clock(d.atSec)}</span>
      </div>
      <ul className="space-y-1">
        {exp.rationale.map((r, i) => (
          <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-muted">
            <span className={isSafety ? 'text-signal-red' : 'text-signal-green'}>›</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      {exp.safety && <div className="mt-2 rounded bg-signal-red/10 px-2 py-1.5 text-[10px] leading-relaxed text-signal-red/90">{exp.safety}</div>}

      {/* option comparison — what the optimizer weighed */}
      {d.options.length > 1 && (
        <div className="mt-2.5 space-y-1">
          <div className="text-[9px] uppercase tracking-[0.16em] text-muted/70">Orderings weighed</div>
          {d.options.slice(0, 3).map((o) => {
            const win = o === chosen
            const lead = lookup.get(o.order[0])?.number ?? o.order[0]
            return (
              <div key={o.order.join()} className="flex items-center gap-2">
                <span className={`tabular w-24 shrink-0 text-[10px] ${win ? 'text-signal-green' : 'text-muted'}`}>
                  {win ? '✓ ' : ''}
                  {lead} first
                </span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded bg-black/40">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${Math.max(3, (o.weightedCostSec / maxCost) * 100)}%`,
                      background: win ? '#22d37a' : '#5b6b86',
                      boxShadow: win ? '0 0 8px #22d37a' : 'none',
                    }}
                  />
                </div>
                <span className="tabular w-16 shrink-0 text-right text-[10px] text-muted">{minsInt(o.weightedCostSec)} wm</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
