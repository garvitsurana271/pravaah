import { Pause, Play, RotateCcw } from 'lucide-react'
import type { SimController, Speed } from '../state/useSimulation'
import { clock } from './format'

const SPEEDS: Speed[] = [1, 2, 4, 8]

export function Topbar({ ctl, onStartTour, tourActive }: { ctl: SimController; onStartTour: () => void; tourActive: boolean }) {
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b hairline bg-panel/60 px-4 py-2.5 backdrop-blur">
      {/* brand */}
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-signal-green/15 ring-1 ring-signal-green/40">
          <span className="text-signal-green text-glow text-lg font-black">प्र</span>
        </div>
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black tracking-tight text-ink">PRAVAAH</span>
            <span className="text-sm font-semibold text-signal-green">प्रवाह</span>
          </div>
          <div className="text-[9.5px] uppercase tracking-[0.22em] text-muted">Glass-Box Dispatcher · SIH25022</div>
        </div>
      </div>

      {/* scenario selector */}
      <div className="flex items-center gap-1 rounded-lg border hairline bg-black/30 p-1">
        {ctl.scenarios.map((s) => {
          const active = ctl.scenario.id === s.id
          const danger = s.id === 'safety'
          return (
            <button
              key={s.id}
              onClick={() => ctl.selectScenario(s.id)}
              title={s.blurb}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? danger
                    ? 'bg-signal-red/20 text-signal-red'
                    : 'bg-signal-blue/20 text-ink'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {s.title}
            </button>
          )
        })}
      </div>

      {/* clock */}
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-signal-green animate-blip" />
        <span className="tabular text-xl font-bold tracking-wider text-ink">{clock(ctl.primary.simSec)}</span>
        <span className="text-[9px] uppercase text-muted">{ctl.finished ? 'cleared' : ctl.playing ? 'live' : 'paused'}</span>
      </div>

      {/* transport */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={ctl.togglePlay}
          aria-label={ctl.playing ? 'Pause' : 'Play'}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-signal-green/20 px-3 py-1.5 text-xs font-semibold text-signal-green transition-colors hover:bg-signal-green/30"
        >
          {ctl.playing ? <Pause size={14} /> : <Play size={14} />}
          {ctl.playing ? 'Pause' : 'Run'}
        </button>
        <button onClick={ctl.reset} aria-label="Reset" className="cursor-pointer rounded-md border hairline bg-black/30 p-1.5 text-muted transition-colors hover:text-ink">
          <RotateCcw size={14} />
        </button>
        <div className="flex items-center overflow-hidden rounded-md border hairline bg-black/30">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => ctl.setSpeed(s)}
              className={`tabular cursor-pointer px-2 py-1.5 text-[11px] transition-colors ${ctl.speed === s ? 'bg-signal-blue/25 text-ink' : 'text-muted hover:text-ink'}`}
            >
              {s}×
            </button>
          ))}
        </div>
        {!tourActive && (
          <button
            onClick={onStartTour}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-signal-green/40 bg-signal-green/10 px-2.5 py-1.5 text-[11px] font-semibold text-signal-green transition-colors hover:bg-signal-green/20"
          >
            <Play size={13} /> Guided Demo
          </button>
        )}
      </div>

      {/* the hero toggle */}
      <button
        onClick={() => ctl.setOptimizerOn(!ctl.optimizerOn)}
        className="ml-auto inline-flex cursor-pointer items-center gap-2.5 rounded-xl border hairline bg-black/40 px-3 py-1.5 transition-colors hover:border-signal-green/50"
        aria-label="Toggle AI optimizer"
      >
        <div className="text-right leading-tight">
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted">Dispatch policy</div>
          <div className={`text-[12px] font-bold ${ctl.optimizerOn ? 'text-signal-green' : 'text-muted'}`}>
            {ctl.optimizerOn ? 'AI OPTIMIZER' : 'FCFS (MANUAL)'}
          </div>
        </div>
        <div className={`relative h-6 w-11 rounded-full transition-colors ${ctl.optimizerOn ? 'bg-signal-green/40' : 'bg-edge'}`}>
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${ctl.optimizerOn ? 'left-[22px] shadow-[0_0_10px_#22d37a]' : 'left-0.5'}`}
          />
        </div>
      </button>
    </header>
  )
}
