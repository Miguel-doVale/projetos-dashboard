import { useEffect, useRef } from 'react'
import { motionEnabled } from '@/lib/motion'

interface Dot {
  x: number
  y: number
  vx: number
  vy: number
}

const LINK_DISTANCE = 150
const MAX_LINE_ALPHA = 0.1
const DOT_ALPHA = 0.28
const MINT = '156, 221, 189'

/** Malha de pontos e linhas em canvas 2D, fixa atrás do conteúdo. Estática com movimento reduzido. */
export function LiveBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const animate = motionEnabled()
    let width = 0
    let height = 0
    let dots: Dot[] = []
    let raf = 0
    let last = 0

    const seed = () => {
      const count = width < 720 ? 30 : 60
      dots = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2
        const speed = 4 + Math.random() * 7 // px/s, deriva lenta
        return { x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y)
          if (d >= LINK_DISTANCE) continue
          ctx.strokeStyle = `rgba(${MINT}, ${(MAX_LINE_ALPHA * (1 - d / LINK_DISTANCE)).toFixed(3)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(dots[i].x, dots[i].y)
          ctx.lineTo(dots[j].x, dots[j].y)
          ctx.stroke()
        }
      }
      ctx.fillStyle = `rgba(${MINT}, ${DOT_ALPHA})`
      for (const d of dots) {
        ctx.beginPath()
        ctx.arc(d.x, d.y, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const wasEmpty = dots.length === 0
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (wasEmpty || (width < 720) !== (dots.length <= 30)) seed()
      draw()
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      for (const d of dots) {
        d.x += d.vx * dt
        d.y += d.vy * dt
        if (d.x < 0 || d.x > width) d.vx *= -1
        if (d.y < 0 || d.y > height) d.vy *= -1
      }
      draw()
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (!animate || raf) return
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.visibilityState === 'hidden' ? stop() : start())

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    if (document.visibilityState !== 'hidden') start()
    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
