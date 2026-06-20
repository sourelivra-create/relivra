import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
  variant?: 'mint' | 'white' | 'deep'
}

/**
 * Símbolo oficial ReLivra: duas curvas em arco formando um ciclo
 * (economia circular) com um "R" estilizado em traços brancos no centro.
 * Extraído do Brand Identity Kit oficial.
 */
export function LogoSymbol({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
    >
      <path
        d="M60 12C34 12 13 33 13 59S34 106 60 106"
        stroke="#74C69D"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M60 106C86 106 107 85 107 59S86 12 60 12"
        stroke="#40916C"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M46 38L46 80M46 38Q70 38 70 52Q70 66 46 66M54 66L70 80"
        stroke="#2D6A4F"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

/**
 * Logo completo (símbolo + wordmark "Relivra" com "livra" em verde mint)
 */
export default function Logo({ size = 32, className, variant = 'deep' }: LogoProps) {
  const wordColor =
    variant === 'white' ? 'text-white' :
    variant === 'mint'  ? 'text-verde-mint' :
    'text-grafite'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoSymbol size={size} />
      <span
        className={cn('font-display font-extrabold tracking-tight', wordColor)}
        style={{ fontSize: size * 0.7 }}
      >
        Re<span className="text-verde-mint">livra</span>
      </span>
    </div>
  )
}
