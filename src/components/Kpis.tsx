import type { ReactNode } from 'react'
import type { Snapshot } from '../engine/simulation'
import { minsInt } from './format'
import { ShieldCheck, GitBranch, GaugeCircle, TrainFront } from 'lucide-react'

function Tile({
  label,
  value,
  sub,
  tone = 'default',
  icon,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'good' | 'warn' | 'danger'
  icon?: ReactNode
}) {
  const toneText =
    tone === 'good' ? 'text-signal-green' : tone === 'warn' ? 'text-signal-amber' : tone === 'danger' ? 'text-signal-red' : 'text-ink'
  return (
    <div className="panel-card flex flex-col justify-between px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
        <span className="text-muted/70">{icon}</span>
      </div>
      <div className={`tabular mt-1 text-2xl font-bold ${toneText}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  )
}

export function Kpis({ optimizer, fcfs, optimizerOn }: { optimizer: Snapshot; fcfs: Snapshot; optimizerOn: boolean }) {
  const primary = optimizerOn ? optimizer : fcfs
  const k = primary.kpis
  const optW = optimizer.kpis.totalWeightedDelaySec
  const fcW = fcfs.kpis.totalWeightedDelaySec
  const maxW = Math.max(optW, fcW, 1)
  const saving = fcW - optW
  const pct = fcW > 0 ? Math.round((saving / fcW) * 100) : 0

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-6">
      <Tile label="Throughput" value={`${k.throughputPerHour}`} sub="trains / hour cleared" icon={<TrainFront size={14} />} />
      <Tile label="Avg delay" value={`${minsInt(k.avgDelaySec)}m`} sub={`${k.active} active · ${k.arrived} cleared`} icon={<GaugeCircle size={14} />} tone={k.avgDelaySec > 1800 ? 'warn' : 'default'} />
      <Tile label="Conflicts resolved" value={`${k.conflictsResolved}`} sub="crossings dispatched" icon={<GitBranch size={14} />} tone="default" />
      <Tile
        label="Unsafe admissions"
        value={`${k.unsafeAdmissionsPrevented}`}
        sub={k.unsafeAdmissionsPrevented > 0 ? 'collisions prevented' : 'line clear · safe'}
        tone={k.unsafeAdmissionsPrevented > 0 ? 'danger' : 'good'}
        icon={<ShieldCheck size={14} />}
      />

      {/* The money tile: live A/B on weighted delay */}
      <div className="panel-card col-span-2 px-3.5 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted">Weighted delay · glass-box vs FCFS</span>
          <span className={`tabular text-xs font-bold ${pct >= 0 ? 'text-signal-green' : 'text-signal-red'}`}>
            {pct >= 0 ? '▼' : '▲'} {Math.abs(pct)}%
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          <Bar label="OPTIMIZER" value={optW} max={maxW} color="#22d37a" active={optimizerOn} />
          <Bar label="FCFS" value={fcW} max={maxW} color="#8aa0c0" active={!optimizerOn} />
        </div>
        <div className="mt-1 text-[10px] text-muted">
          {saving > 0
            ? `Priority-aware dispatch saves ${minsInt(saving)} weighted-min of delay.`
            : 'Running — divergence builds as crossings are resolved.'}
        </div>
      </div>
    </div>
  )
}

function Bar({ label, value, max, color, active }: { label: string; value: number; max: number; color: string; active: boolean }) {
  const pctW = Math.max(2, (value / max) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className={`tabular w-16 shrink-0 text-[10px] ${active ? 'text-ink' : 'text-muted'}`}>{label}</span>
      <div className="relative h-3 flex-1 overflow-hidden rounded bg-black/40">
        <div
          className="h-full rounded transition-[width] duration-300"
          style={{ width: `${pctW}%`, background: color, opacity: active ? 1 : 0.5, boxShadow: active ? `0 0 10px ${color}` : 'none' }}
        />
      </div>
      <span className="tabular w-20 shrink-0 text-right text-[10px] text-muted">{minsInt(value)} wmin</span>
    </div>
  )
}
