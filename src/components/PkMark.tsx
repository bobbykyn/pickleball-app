/** The locked pk mark (master files from BRAND-LOCK). Swaps to the white-p version in dark mode. */
export default function PkMark({ height = 48, className = '' }: { height?: number; className?: string }) {
  const width = Math.round(height * (467 / 480))
  return (
    <span className={`inline-block shrink-0 ${className}`} style={{ width, height }}>
      <img src="/pk-mark-white-red.png" alt="pk — Pickle Kitchen" width={width} height={height} className="pk-mark-on-dark select-none" style={{ width, height }} />
      <img src="/pk-mark-navy-red.png" alt="pk — Pickle Kitchen" width={width} height={height} className="pk-mark-on-light select-none" style={{ width, height }} />
    </span>
  )
}
