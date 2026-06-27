import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoSymbolProps {
  size?: number
  className?: string
  variant?: 'mint' | 'white' | 'deep'
}

interface LogoProps {
  iconSize?: number
  textSize?: number
  className?: string
  variant?: 'mint' | 'white' | 'deep'
}

/**
 * Símbolo oficial Relivra: livro aberto com páginas em leque,
 * baseado na arte fornecida pela marca (public/livro-icon.png).
 * Proporção original ~577×171 (mais largo que alto — quase 3.4:1).
 *
 * IMPORTANTE: como essa proporção é bem mais larga que alta, o
 * parâmetro "size" aqui controla a ALTURA do ícone (não um
 * quadrado), então a largura final fica maior que "size".
 */
export function LogoSymbol({ size = 24, className, variant = 'deep' }: LogoSymbolProps) {
  const largura = Math.round(size * (577 / 171))
  const src = variant === 'white' ? '/livro-icon-white.png' : '/livro-icon.png'
  return (
    <Image
      src={src}
      alt="Relivra"
      width={largura}
      height={size}
      className={className}
      priority
    />
  )
}

/**
 * Logo completo (símbolo + wordmark "Relivra" com "livra" em verde mint).
 * "iconSize" e "textSize" são independentes — ajustar um não afeta
 * o outro, dando controle fino sobre a proporção visual em cada contexto.
 */
export default function Logo({ iconSize = 22, textSize = 22, className, variant = 'deep' }: LogoProps) {
  const wordColor =
    variant === 'white' ? 'text-white' :
    variant === 'mint'  ? 'text-verde-mint' :
    'text-grafite'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoSymbol size={iconSize} variant={variant} />
      <span
        className={cn('font-display font-extrabold tracking-tight', wordColor)}
        style={{ fontSize: textSize }}
      >
        Re<span className="text-verde-mint">livra</span>
      </span>
    </div>
  )
}
