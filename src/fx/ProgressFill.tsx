import { useEffect, useRef, useState } from 'react'
import { inView, motion } from 'motion/react'
import { motionEnabled } from '@/lib/motion'

/** Preenchimento de barra de progresso: cresce de 0 até `fraction` (0 a 1) ao aparecer. Sem movimento, já nasce cheio. */
export function ProgressFill({ fraction }: { fraction: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const animate = motionEnabled() && typeof IntersectionObserver !== 'undefined'
  useEffect(() => {
    const el = ref.current
    if (!animate || !el) return
    return inView(el, () => {
      setSeen(true)
      return undefined
    })
  }, [animate])
  const target = Math.min(1, Math.max(0, fraction))
  return (
    <motion.div
      ref={ref}
      className="h-full w-full origin-left bg-accent"
      initial={animate ? { scaleX: 0 } : false}
      animate={{ scaleX: animate && !seen ? 0 : target }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}
