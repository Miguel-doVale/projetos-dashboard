import { useLayoutEffect, useRef } from 'react'
import { animate, inView } from 'motion/react'
import { motionEnabled } from '@/lib/motion'

const DURATION = 0.9

/** Troca cada sequência de dígitos pelo valor parcial (`1/27` conta os dois lados). */
function partial(value: string, t: number): string {
  return value.replace(/\d+/g, (digits) => String(Math.round(Number(digits) * t)).padStart(1, '0'))
}

/**
 * Número que conta de 0 até o valor ao entrar na tela. O `aria-label` e o texto
 * final estão no DOM desde o início; sem movimento (ou sem IntersectionObserver) mostra o valor na hora.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const counted = useRef(false) // já contou uma vez; mudanças de valor depois disso entram direto

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Depois da primeira contagem (ou no meio dela) o valor novo entra direto.
    if (counted.current) {
      el.textContent = value
      return
    }
    if (!motionEnabled() || typeof IntersectionObserver === 'undefined' || !/\d/.test(value)) return
    el.textContent = partial(value, 0)
    let controls: ReturnType<typeof animate> | null = null
    const stop = inView(el, () => {
      counted.current = true
      controls = animate(0, 1, {
        duration: DURATION,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (t) => {
          el.textContent = partial(value, t)
        },
        onComplete: () => {
          el.textContent = value
        },
      })
      return undefined
    })
    return () => {
      stop()
      controls?.stop()
    }
  }, [value])

  return (
    <span ref={ref} role="img" aria-label={value} className={className}>
      {value}
    </span>
  )
}
