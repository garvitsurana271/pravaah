import { ShieldCheck } from 'lucide-react'
import type { Snapshot } from '../engine/simulation'
import type { Projected } from '../state/useSimulation'
import { minsInt } from './format'

export function Kpis({ optimizer, fcfs, optimizerOn, projected }: { optimizer: Snapshot; fcfs: Snapshot; optimizerOn: boolean; projected: Projected }) {
  const k = (optimizerOn ? optimizer : fcfs).kpis
  const optW = optimizer.kpis.totalWeightedDelaySec
  const fcW = fcfs.kpis.totalWeightedDelaySec
  const maxW = Math.max(optW, fcW, 1)
  const refused = k.unsafeAdmissionsPrevented

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.55fr_1fr]">
      {/* HERO — the entire pitch in one glance */}
      <div className="panel-raised flex items-center gap-6 px-6 py-4">
        <div className="shrink-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">AI vs manual dispatching · live</div>
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <span className="tabular text-[68px] font-bold leading-none text-signal-green" style={{ textShadow: '0 0 44px rgba(34,211,122,0.35)' }}>
              {projected.pct}%
            </span>
            <span className="text-lg font-semibold text-ink">less delay</span>
          </div>
          <div className="mt-2 max-w-[270px] text-[11.5px] leading-snug text-muted">
            Pravaah's AI against first-come, first-served, the way it is dispatched today. Saves {minsInt(projected.savingSec)} train-minutes this peak hour.
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 self-stretch border-l border-edge/70 pl-6 pt-2">
          <Bar label="Pravaah AI" value={optW} max={maxW} color="#22d37a" active={optimizerOn} />
          <Bar label="Manual (today)" value={fcW} max={maxW} color="#8aa0c0" active={!optimizerOn} />
          <div className="pt-1 text-[10px] text-muted">Watch the bar split as the AI protects premier trains at every crossing.</div>
        </div>
      </div>

      {/* SAFETY chip (forward) + secondary stats (recessed) */}
      <div className="flex flex-col gap-3">
        <div className="panel-raised flex items-center gap-3.5 px-4 py-3" style={{ borderColor: 'rgba(34,211,122,0.4)' }}>
          <ShieldCheck size={30} className="shrink-0 text-signal-green glow-green" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="tabular text-3xl font-bold leading-none text-signal-green">{refused}</span>
              <span className="text-[13px] font-semibold text-ink">unsafe routes refused</span>
            </div>
            <div className="mt-1 text-[10.5px] leading-snug text-muted">A collision is impossible by construction. The interlocking blocks it before any AI decides.</div>
          </div>
        </div>
        <div className="panel-recessed grid flex-1 grid-cols-3 divide-x divide-edge/50">
          <Stat label="Throughput" value={`${k.throughputPerHour}`} sub="trains/hr" />
          <Stat label="Avg delay" value={`${minsInt(k.avgDelaySec)}m`} sub={`${k.active} running`} />
          <Stat label="Crossings" value={`${k.conflictsResolved}`} sub="resolved" />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col justify-center px-3 py-2.5">
      <span className="text-[9.5px] uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="tabular mt-0.5 text-xl font-semibold leading-none text-ink/90">{value}</span>
      {sub && <span className="mt-1 text-[9.5px] text-muted/80">{sub}</span>}
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
