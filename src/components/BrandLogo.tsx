import PkMark from './PkMark'

interface BrandLogoProps {
  /** Overall scale of the lockup */
  size?: 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Stacked Pickle Kitchen lockup for the splash and sign-in screens:
 *   pk mark
 *   PICKLE KITCHEN
 *   匹克廚房
 *   OWN THE KITCHEN   (signature line — masthead form per BRAND-LOCK)
 */
export default function BrandLogo({ size = 'lg', className = '' }: BrandLogoProps) {
  const markH = { md: 96, lg: 140, xl: 168 }[size]
  const wordmark = {
    md: 'text-3xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-6xl',
  }[size]

  return (
    <div className={`flex flex-col items-center text-center select-none ${className}`}>
      <PkMark height={markH} />
      <h1 className={`mt-6 font-display font-semibold uppercase tracking-[0.12em] leading-none text-foreground ${wordmark}`}>
        Pickle Kitchen
      </h1>
      <span className="mt-3 font-display text-base tracking-[0.4em] pl-[0.4em] text-foreground/70">
        匹克廚房
      </span>
      <span className="mt-5 flex items-center gap-3">
        <span className="h-px w-8 bg-brand-primary" />
        <span className="font-display text-xs tracking-[0.3em] pl-[0.3em] font-semibold text-foreground/60">
          OWN THE KITCHEN
        </span>
        <span className="h-px w-8 bg-brand-primary" />
      </span>
    </div>
  )
}
