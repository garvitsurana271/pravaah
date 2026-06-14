import { ShieldAlert } from 'lucide-react'

// The moment the whole project turns on: the interlocking refusing an unsafe
// route, tied to the real Balasore disaster. Fires when a collision is blocked.
export function SafetyFlash({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-black/55 backdrop-blur-[2px]">
      <div
        className="panel-card animate-rise max-w-xl px-10 py-7 text-center"
        style={{ borderColor: '#ff4d4d', boxShadow: '0 0 80px rgba(255,77,77,0.45)' }}
      >
        <ShieldAlert size={46} className="mx-auto text-signal-red glow-red" />
        <div className="mt-3 text-3xl font-bold tracking-tight text-signal-red">COLLISION PREVENTED</div>
        <div className="mt-2 text-[15px] text-ink">The interlocking refused a route set toward a line that was already occupied.</div>
        <div className="mt-3 text-[13px] leading-relaxed text-muted">
          Balasore, 2 June 2023: a route exactly like this killed nearly 300 people. No dispatch policy, AI or human, can override this
          refusal.
        </div>
      </div>
    </div>
  )
}
