import { Play, X } from 'lucide-react'
import type { TourCaption } from '../state/useTour'

const ACCENT: Record<TourCaption['tone'], string> = {
  green: '#22d37a',
  blue: '#3aa0ff',
  red: '#ff4d4d',
  amber: '#ffb02e',
}

export function TourOverlay({ caption, onStop }: { caption: TourCaption | null; onStop: () => void }) {
  if (!caption) return null
  const accent = ACCENT[caption.tone]
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className="panel-card pointer-events-auto flex max-w-3xl items-center gap-4 px-6 py-4 shadow-2xl animate-rise"
        style={{ borderColor: accent, boxShadow: `0 0 40px ${accent}33` }}
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `${accent}22` }}>
          <span className="h-2.5 w-2.5 rounded-full animate-blip" style={{ background: accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-snug text-ink">{caption.text}</div>
          {caption.sub && <div className="mt-0.5 text-[12px] text-muted">{caption.sub}</div>}
          <div className="mt-2 flex items-center gap-1.5">
            {Array.from({ length: caption.total }).map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i + 1 === caption.index ? 18 : 7,
                  background: i + 1 <= caption.index ? accent : '#2a3a57',
                }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={onStop}
          className="shrink-0 cursor-pointer rounded-md border hairline bg-black/30 px-2.5 py-1.5 text-[11px] text-muted transition-colors hover:text-ink"
        >
          Skip
        </button>
      </div>
    </div>
  )
}

export function TourNudge({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[68px] z-40 flex justify-center px-4">
      <div className="panel-card pointer-events-auto flex items-center gap-3 px-4 py-2 shadow-xl animate-rise" style={{ borderColor: '#22d37a55' }}>
        <span className="hidden text-[12px] text-muted sm:inline">First time here?</span>
        <button
          onClick={onStart}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-signal-green/20 px-3 py-1.5 text-[12px] font-semibold text-signal-green transition-colors hover:bg-signal-green/30"
        >
          <Play size={13} /> Watch the 60-second guided demo
        </button>
        <button onClick={onDismiss} aria-label="Dismiss" className="cursor-pointer rounded p-1 text-muted hover:text-ink">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
