import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { LiveBackground } from '@/fx/LiveBackground'
import { Header } from '@/shell/Header'
import { motionEnabled, scrollToTop, useReveal, useSmoothScroll } from '@/lib/motion'

/** `banner` aparece no topo do conteúdo, abaixo do cabeçalho fixo. */
export function Layout({ banner = null }: { banner?: ReactNode }) {
  const { pathname } = useLocation()
  const first = useRef(true)
  useSmoothScroll()
  useEffect(() => {
    scrollToTop()
    first.current = false
  }, [pathname])
  useReveal(pathname)
  const animate = motionEnabled()

  return (
    <>
      <LiveBackground />
      <Header />
      <main className="mx-auto max-w-app px-4 pt-[72px] pb-24 sm:px-6">
        <motion.div
          key={pathname}
          className="pt-12"
          initial={first.current || !animate ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animate ? 0.2 : 0, ease: 'easeOut' }}
        >
          {banner}
          <Outlet />
        </motion.div>
      </main>
    </>
  )
}
