interface BrandLogoProps {
  /** Overall scale of the wordmark */
  size?: 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * The full stacked Pickle Kitchen logo lockup:
 *   — 匹克廚房 —
 *      PICKLE
 *      KITCHEN
 *   HONG KONG ◆HK EST. 2024
 *   GEAR UP. PLAY WELL. LIVE MORE.
 */
export default function BrandLogo({ size = 'lg', className = '' }: BrandLogoProps) {
  const wordmark = {
    md: 'text-4xl md:text-5xl',
    lg: 'text-6xl md:text-7xl',
    xl: 'text-7xl md:text-8xl',
  }[size]

  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      {/* Top rule + Chinese */}
      <div className="flex items-center gap-3 mb-3">
        <span className="h-px w-8 bg-brand-primary" />
        <span className="font-display text-base md:text-lg tracking-[0.35em] text-brand-primary font-semibold pl-[0.35em]">
          匹克廚房
        </span>
        <span className="h-px w-8 bg-brand-primary" />
      </div>

      {/* Wordmark */}
      <h1 className={`font-display font-bold leading-[0.92] tracking-tight text-foreground ${wordmark}`}>
        PICKLE<br />KITCHEN
      </h1>

      {/* EST. bar */}
      <div className="flex items-center gap-2 mt-5 w-full max-w-[280px]">
        <span className="h-px flex-1 bg-brand-border" />
        <span className="text-[10px] tracking-[0.25em] text-foreground/60 font-display font-semibold whitespace-nowrap">
          HONG KONG
        </span>
        <span className="relative inline-flex items-center justify-center w-5 h-5 rotate-45 bg-brand-primary shrink-0">
          <span className="-rotate-45 text-[8px] font-bold text-white leading-none">HK</span>
        </span>
        <span className="text-[10px] tracking-[0.25em] text-foreground/60 font-display font-semibold whitespace-nowrap">
          EST. 2024
        </span>
        <span className="h-px flex-1 bg-brand-border" />
      </div>

      {/* Tagline */}
      <p className="mt-4 font-display tracking-[0.2em] text-brand-primary text-xs md:text-sm font-semibold">
        GEAR UP. PLAY WELL. LIVE MORE.
      </p>
    </div>
  )
}
