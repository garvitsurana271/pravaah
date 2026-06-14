import type { Snapshot } from '../engine/simulation'
import { clock } from './format'

const TONE: Record<string, string> = {
  INFO: 'text-muted',
  WARN: 'text-signal-amber',
  CRITICAL: 'text-signal-red',
}

export function EventLog({ snap }: { snap: Snapshot }) {
  return (
    <div className="panel-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b hairline px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Control Log</span>
        <span className="inline-flex items-center gap-1 text-[9px] text-signal-green">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-green animate-blip" /> LIVE
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-auto px-3 py-2">
        {snap.events.length === 0 && <div className="text-[11px] text-muted/60">Awaiting movements…</div>}
        {snap.events.map((e, i) => (
          <div key={i} className="flex gap-2 text-[11px] leading-snug">
            <span className="tabular shrink-0 text-muted/60">{clock(e.atSec)}</span>
            <span className={TONE[e.severity]}>{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
