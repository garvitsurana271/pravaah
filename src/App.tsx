import { useState } from 'react'
import { useSimulation } from './state/useSimulation'
import { useTour } from './state/useTour'
import { TourOverlay, TourNudge } from './components/TourOverlay'
import { Topbar } from './components/Topbar'
import { Kpis } from './components/Kpis'
import { CorridorView } from './components/CorridorView'
import { TrainTable } from './components/TrainTable'
import { GeoMap } from './components/GeoMap'
import { EventLog } from './components/EventLog'
import { DispatcherPanel } from './components/DispatcherPanel'
import { CLASS_META } from './engine/priorities'
import { BALASORE_CORRIDOR } from './engine/corridor'

const LEGEND_CLASSES = ['SPECIAL', 'SUPERFAST', 'EXPRESS', 'PASSENGER', 'GOODS'] as const

export default function App() {
  const ctl = useSimulation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const tour = useTour(ctl, setSelectedId)
  const [nudge, setNudge] = useState(true)

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <Topbar ctl={ctl} onStartTour={() => { setNudge(false); tour.start() }} tourActive={tour.active} />
      {nudge && !tour.active && (
        <TourNudge onStart={() => { setNudge(false); tour.start() }} onDismiss={() => setNudge(false)} />
      )}
      <TourOverlay caption={tour.caption} onStop={tour.stop} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[1fr_minmax(360px,400px)] lg:overflow-hidden">
        {/* left column */}
        <div className="flex min-h-0 flex-col gap-3">
          <Kpis optimizer={ctl.optimizer} fcfs={ctl.fcfs} optimizerOn={ctl.optimizerOn} />

          {/* hero board */}
          <section className="panel-card flex min-h-[360px] flex-1 flex-col overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">Live Section Control Board</span>
              <span className="text-[11px] text-muted">{BALASORE_CORRIDOR.subtitle}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2.5">
                {LEGEND_CLASSES.map((cl) => (
                  <span key={cl} className="inline-flex items-center gap-1 text-[9px] text-muted">
                    <span className="h-2 w-2 rounded-sm" style={{ background: CLASS_META[cl].color }} />
                    {CLASS_META[cl].short}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 text-[9px] text-signal-amber">
                  <span className="h-2 w-2 rounded-sm bg-signal-amber" /> HELD
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] text-signal-red">⚠ CONFLICT</span>
              </div>
            </div>
            <p className="border-b hairline px-4 py-1.5 text-[11px] leading-relaxed text-muted/80">{ctl.scenario.blurb}</p>
            <div className="min-h-0 flex-1">
              <CorridorView snap={ctl.primary} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </section>

          {/* bottom row */}
          <div className="grid h-[300px] shrink-0 grid-cols-1 gap-3 md:grid-cols-[1.15fr_0.85fr_1fr]">
            <TrainTable snap={ctl.primary} selectedId={selectedId} onSelect={setSelectedId} />
            <GeoMap snap={ctl.primary} />
            <EventLog snap={ctl.primary} />
          </div>
        </div>

        {/* right rail — the glass box */}
        <aside className="min-h-0 lg:h-full">
          <DispatcherPanel snap={ctl.primary} optimizerOn={ctl.optimizerOn} selectedId={selectedId} />
        </aside>
      </main>
    </div>
  )
}
