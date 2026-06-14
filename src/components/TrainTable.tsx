import type { Snapshot } from '../engine/simulation'
import { CLASS_META, CLASS_WEIGHT } from '../engine/priorities'
import { signed } from './format'

const STATE_TONE: Record<string, string> = {
  RUNNING: 'text-signal-green',
  HELD: 'text-signal-amber',
  DWELL: 'text-signal-blue',
  SCHEDULED: 'text-muted',
  ARRIVED: 'text-muted/60',
}
const ORDER: Record<string, number> = { RUNNING: 0, HELD: 1, DWELL: 2, SCHEDULED: 3, ARRIVED: 4 }

export function TrainTable({ snap, selectedId, onSelect }: { snap: Snapshot; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const rows = [...snap.trains].sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.delaySec - a.delaySec)
  return (
    <div className="panel-card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b hairline px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Train Register</span>
        <span className="tabular text-[10px] text-muted">{snap.trains.length} services</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="sticky top-0 z-10 bg-panel2 text-[9px] uppercase tracking-wide text-muted/70">
              <th className="py-1.5 pl-3" />
              <th className="py-1.5 pr-2 font-medium">Train</th>
              <th className="py-1.5 pr-2 font-medium">Service</th>
              <th className="py-1.5 text-center font-medium">Dir</th>
              <th className="py-1.5 pr-2 font-medium">State</th>
              <th className="py-1.5 pr-2 text-right font-medium">km/h</th>
              <th className="py-1.5 pr-3 text-right font-medium">Delay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const meta = CLASS_META[t.cls]
              const sel = selectedId === t.id
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelect(sel ? null : t.id)}
                  className={`cursor-pointer border-b border-edge/40 transition-colors hover:bg-white/5 ${sel ? 'bg-white/[0.07]' : ''}`}
                >
                  <td className="py-1.5 pl-3 pr-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
                  </td>
                  <td className="tabular py-1.5 pr-2 text-xs font-semibold text-ink">{t.number}</td>
                  <td className="py-1.5 pr-2">
                    <div className="max-w-[150px] truncate text-[11.5px] text-ink/90">{t.name}</div>
                    <div className="text-[9px] uppercase tracking-wide" style={{ color: meta.color }}>
                      {meta.short} · ×{CLASS_WEIGHT[t.cls]}
                    </div>
                  </td>
                  <td className="py-1.5 pr-1 text-center text-[11px] text-muted">{t.direction === 'UP' ? '▶' : '◀'}</td>
                  <td className={`py-1.5 pr-2 text-[10px] font-semibold ${STATE_TONE[t.state]}`}>{t.state}</td>
                  <td className="tabular py-1.5 pr-2 text-right text-[11px] text-muted">{t.speedKmh > 0 ? `${t.speedKmh}` : '—'}</td>
                  <td className={`tabular py-1.5 pr-3 text-right text-[11px] ${t.delaySec > 300 ? 'text-signal-amber' : 'text-muted'}`}>{signed(t.delaySec)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
