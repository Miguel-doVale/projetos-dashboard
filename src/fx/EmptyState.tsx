import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { inView, motion } from 'motion/react'
import { motionEnabled } from '@/lib/motion'

// 4 pontos ligados por linhas finas, no estilo da constelação.
const DOTS: [number, number][] = [
  [18, 44],
  [48, 16],
  [84, 38],
  [106, 12],
]
const LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
]

/**
 * Tela vazia: ilustração pequena que flutua devagar acima do texto, e só enquanto está na tela.
 * `compact` é a versão estática, para painéis e diálogos.
 */
export function EmptyState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const canAnimate = !compact && motionEnabled() && typeof IntersectionObserver !== 'undefined'
  useEffect(() => {
    const el = ref.current
    if (!canAnimate || !el) return
    return inView(el, () => {
      setVisible(true)
      return () => setVisible(false)
    })
  }, [canAnimate])
  const animate = canAnimate && visible
  return (
    <div
      ref={ref}
      data-empty-state
      className={`flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-raised text-center text-sm text-muted ${compact ? 'px-3 py-4' : 'px-4 py-8'}`}
    >
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 124 60"
        className={compact ? 'h-9 w-[75px]' : 'h-[60px] w-[124px]'}
        animate={animate ? { y: [0, -4, 0], transition: { duration: 6, ease: 'easeInOut', repeat: Infinity } } : { y: 0, transition: { duration: 0.3 } }}
      >
        {LINES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={DOTS[a][0]}
            y1={DOTS[a][1]}
            x2={DOTS[b][0]}
            y2={DOTS[b][1]}
            stroke="#9cddbd"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
        ))}
        {DOTS.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={i === 1 ? 3.5 : 2.5}
            fill="#9cddbd"
            animate={
              animate
                ? { opacity: [1, 0.45, 1], transition: { duration: 3.5 + i * 0.7, ease: 'easeInOut', repeat: Infinity, delay: i * 0.5 } }
                : { opacity: 1, transition: { duration: 0.3 } }
            }
          />
        ))}
      </motion.svg>
      <p>{children}</p>
    </div>
  )
}
