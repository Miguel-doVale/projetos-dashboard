import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

/** Movimento só roda com matchMedia disponível e sem prefers-reduced-motion. */
export function motionEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let activeLenis: Lenis | null = null

function scrollLocked(): boolean {
  const body = document.body
  return body.hasAttribute('data-scroll-locked') || body.style.overflow === 'hidden'
}

/** Uma instância do Lenis movida pelo ticker do GSAP; pausa enquanto o Radix trava a rolagem do body. */
export function useSmoothScroll() {
  useEffect(() => {
    if (!motionEnabled()) return
    gsap.registerPlugin(ScrollTrigger)
    const lenis = new Lenis({ autoRaf: false })
    activeLenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const sync = () => (scrollLocked() ? lenis.stop() : lenis.start())
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-scroll-locked', 'style'] })
    sync()

    return () => {
      observer.disconnect()
      gsap.ticker.remove(tick)
      lenis.destroy()
      if (activeLenis === lenis) activeLenis = null
    }
  }, [])
}

/** Volta ao topo a cada troca de rota (pelo Lenis, quando ativo). */
export function scrollToTop() {
  if (activeLenis) activeLenis.scrollTo(0, { immediate: true })
  else window.scrollTo(0, 0)
}

/**
 * Entrada de `[data-reveal]` dentro de `root` ao entrar na viewport, uma vez.
 * O estado escondido é aplicado aqui, logo antes de animar; o que já está
 * acima da dobra nunca é escondido. Recria a cada mudança de `dep`.
 */
export function useReveal(dep: unknown, rootSelector = 'main') {
  useEffect(() => {
    if (!motionEnabled()) return
    const root = document.querySelector(rootSelector)
    if (!root) return
    gsap.registerPlugin(ScrollTrigger)
    const limit = window.innerHeight * 0.92
    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]')).filter(
      (el) => el.getBoundingClientRect().top > limit,
    )
    gsap.set(targets, { opacity: 0, y: 16 })
    const triggers = targets.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () =>
          gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'opacity,transform' }),
      }),
    )
    return () => {
      triggers.forEach((t) => t.kill())
      gsap.killTweensOf(targets)
      gsap.set(targets, { clearProps: 'opacity,transform' })
    }
  }, [dep, rootSelector])
}
