import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { Header } from '@/shell/Header'
import { motionEnabled, scrollToTop, useReveal, useSmoothScroll } from '@/lib/motion'

export function Layout() {
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
      <Header />
      <main className="mx-auto max-w-app px-4 pt-[72px] pb-24 sm:px-6">
        <motion.div
          key={pathname}
          className="pt-12"
          initial={first.current || !animate ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: animate ? 0.2 : 0, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </>
  )
}
