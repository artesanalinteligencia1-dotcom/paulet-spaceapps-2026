// The PAULET wordmark (owner's reference, 2026-11-14): wide geometric letters drawn as strokes, the E as three bars
// with no spine. Drawn in code so it stays sharp at any size and needs no image file.
export function PauletLogo({ height = 40, color = '#e8e0cc', className }: { height?: number; color?: string; className?: string }) {
  const s = 5.5
  return (
    <svg viewBox="-4 -4 300 58" height={height} className={className} role="img" aria-label="Paulet" fill="none" stroke={color} strokeWidth={s} strokeLinecap="square" strokeLinejoin="miter">
      <title>Paulet</title>
      {/* P */}
      <path d="M2 50V2h22a13 13 0 0 1 0 26H2" />
      {/* A */}
      <path d="M52 50 L70 2 L88 50 M59 33h22" />
      {/* U */}
      <path d="M102 2v30a16 16 0 0 0 32 0V2" />
      {/* L */}
      <path d="M152 2v48h30" />
      {/* E: three bars, no spine */}
      <path d="M198 2h32M204 26h26M198 50h32" />
      {/* T */}
      <path d="M244 2h44M266 2v48" />
    </svg>
  )
}
