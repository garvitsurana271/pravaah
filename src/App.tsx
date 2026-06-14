import { useEffect, useRef, useState } from 'react'
import { useSimulation } from './state/useSimulation'
import { useTour } from './state/useTour'
import { TourOverlay } from './components/TourOverlay'
import { SafetyFlash } from './components/SafetyFlash'
import { Topbar } from './components/Topbar'
import { Kpis } from './components/Kpis'
import { CorridorView } from './components/CorridorView'
import { StringLine } from './components/StringLine'
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

  // Fire the "collision prevented" moment whenever the interlocking refuses a route.
  const [flash, setFlash] = useState(false)
  const prevUnsafe = useRef(0)
  const unsafe = ctl.primary.kpis.unsafeAdmissionsPrevented
  useEffect(() => {
    if (unsafe > prevUnsafe.current) {
      setFlash(true)
      const id = window.setTimeout(() => setFlash(false), 5200)
      prevUnsafe.current = unsafe
      return () => window.clearTimeout(id)
    }
    prevUnsafe.current = unsafe
  }, [unsafe])

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden">
      <Topbar ctl={ctl} onStartTour={tour.start} tourActive={tour.active} />
      <TourOverlay caption={tour.caption} onStop={tour.stop} />
      <SafetyFlash show={flash} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto p-3 lg:grid-cols-[1fr_minmax(360px,400px)]">
        {/* left column */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="panel-in">
            <Kpis optimizer={ctl.optimizer} fcfs={ctl.fcfs} optimizerOn={ctl.optimizerOn} projected={ctl.projected} />
          </div>

          {/* hero board */}
          <section className="panel-card panel-in flex min-h-[360px] flex-1 flex-col overflow-hidden" style={{ animationDelay: '80ms' }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b hairline px-4 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">Live Section Control Board</span>
              <span className="text-[11px] text-muted">{BALASORE_CORRIDOR.subtitle}</span>
              <span className="rounded-full border border-edge/70 bg-black/30 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-muted/80">
                Real stations &amp; timetable · movements simulated
              </span>
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
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-[5]">
                <CorridorView snap={ctl.primary} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              <div className="min-h-0 flex-[4] border-t hairline">
                <StringLine snap={ctl.primary} />
              </div>
            </div>
          </section>

          {/* bottom row */}
          <div className="grid h-[300px] shrink-0 grid-cols-1 gap-3 panel-in md:grid-cols-[1.15fr_0.85fr_1fr]" style={{ animationDelay: '160ms' }}>
            <TrainTable snap={ctl.primary} selectedId={selectedId} onSelect={setSelectedId} />
            <GeoMap snap={ctl.primary} />
            <EventLog snap={ctl.primary} />
          </div>
        </div>

        {/* right rail — the glass box */}
        <aside className="panel-in min-h-0 lg:h-full" style={{ animationDelay: '240ms' }}>
          <DispatcherPanel snap={ctl.primary} optimizerOn={ctl.optimizerOn} selectedId={selectedId} />
        </aside>
      </main>
    </div>
  )
}
