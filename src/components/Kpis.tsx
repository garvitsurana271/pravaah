import type { Snapshot } from '../engine/simulation'
import type { Projected } from '../state/useSimulation'
import { minsInt } from './format'

export function Kpis({ optimizer, fcfs, optimizerOn, projected }: { optimizer: Snapshot; fcfs: Snapshot; optimizerOn: boolean; projected: Projected }) {
  const k = (optimizerOn ? optimizer : fcfs).kpis
  const optW = optimizer.kpis.totalWeightedDelaySec
  const fcW = fcfs.kpis.totalWeightedDelaySec
  const maxW = Math.max(optW, fcW, 1)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
      {/* HERO: the AI-vs-manual result, stated big */}
      <div className="panel-card flex items-center gap-5 px-5 py-3">
        <div className="shrink-0">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted">AI vs manual dispatching</div>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-[44px] font-bold leading-none text-signal-green">{projected.pct}%</span>
            <span className="text-sm font-medium text-ink">less delay</span>
          </div>
          <div className="mt-1 max-w-[230px] text-[11px] leading-snug text-muted">
            Over this peak hour, Pravaah's AI saves {minsInt(projected.savingSec)} train-minutes against first-come, first-served, the way it is dispatched today.
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2 border-l border-edge/70 pl-5">
          <Bar label="Pravaah AI" value={optW} max={maxW} color="#22d37a" active={optimizerOn} />
          <Bar label="Manual (today)" value={fcW} max={maxW} color="#8aa0c0" active={!optimizerOn} />
        </div>
      </div>

      {/* segmented stat strip (no per-tile borders, no icons) */}
      <div className="panel-card grid grid-cols-4 divide-x divide-edge/60">
        <Stat label="Throughput" value={`${k.throughputPerHour}`} sub="trains/hr" />
        <Stat label="Avg delay" value={`${minsInt(k.avgDelaySec)}m`} sub={`${k.active} running`} tone={k.avgDelaySec > 1800 ? 'warn' : 'ink'} />
        <Stat label="Conflicts" value={`${k.conflictsResolved}`} sub="resolved" />
        <Stat
          label="Collisions"
          value={`${k.unsafeAdmissionsPrevented}`}
          sub={k.unsafeAdmissionsPrevented > 0 ? 'STOPPED' : 'line safe'}
          tone={k.unsafeAdmissionsPrevented > 0 ? 'danger' : 'good'}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, sub, tone = 'ink' }: { label: string; value: string; sub?: string; tone?: 'ink' | 'good' | 'warn' | 'danger' }) {
  const col = tone === 'good' ? 'text-signal-green' : tone === 'warn' ? 'text-signal-amber' : tone === 'danger' ? 'text-signal-red' : 'text-ink'
  return (
    <div className="flex flex-col justify-center px-3.5 py-2.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className={`tabular mt-0.5 text-2xl font-semibold leading-none ${col}`}>{value}</span>
      {sub && <span className="mt-1 text-[10px] text-muted">{sub}</span>}
    </div>
  )
}

function Bar({ label, value, max, color, active }: { label: string; value: number; max: number; color: string; active: boolean }) {
  const pctW = Math.max(3, (value / max) * 100)
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-24 shrink-0 text-[11px] ${active ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
      <div className="relative h-3.5 flex-1 overflow-hidden rounded-sm bg-black/40">
        <div
          className="h-full rounded-sm transition-[width] duration-500"
          style={{ width: `${pctW}%`, background: color, opacity: active ? 1 : 0.55, boxShadow: active ? `0 0 12px ${color}` : 'none' }}
        />
      </div>
      <span className="tabular w-14 shrink-0 text-right text-[11px] text-muted">{minsInt(value)} min</span>
    </div>
  )
}
