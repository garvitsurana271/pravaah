// Pravaah mark: a track that reaches a junction and the AI routes it onto the
// green path, with a lit signal at the switch. Dispatch, made visual.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path d="M4 28 H17" stroke="#8aa0c0" strokeWidth={3.2} strokeLinecap="round" />
      <path d="M17 28 H36" stroke="#3f4f68" strokeWidth={3.2} strokeLinecap="round" />
      <path
        d="M17 28 C26 28 28 15 36 10"
        stroke="#22d37a"
        strokeWidth={3.2}
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 3px rgba(34,211,122,0.6))' }}
      />
      <circle cx="17" cy="28" r="4.4" fill="#22d37a" style={{ filter: 'drop-shadow(0 0 4px #22d37a)' }} />
      <circle cx="17" cy="28" r="1.7" fill="#04140c" />
    </svg>
  )
}
