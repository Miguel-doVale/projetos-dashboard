import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  enter: null as null | (() => void),
  opts: null as null | { onUpdate: (t: number) => void; onComplete: () => void },
  stop: vi.fn(),
}))

vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  inView: (_el: Element, cb: () => void) => {
    h.enter = cb
    return () => {}
  },
  animate: (_a: number, _b: number, opts: NonNullable<typeof h.opts>) => {
    h.opts = opts
    return { stop: h.stop }
  },
}))

import { CountUp } from '@/fx/CountUp'

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
  h.stop.mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CountUp depois da contagem', () => {
  it('valor novo depois de contar aparece no texto e bate com o aria-label', () => {
    const { rerender } = render(<CountUp value="1/27" />)
    h.enter!()
    h.opts!.onUpdate(0.5)
    h.opts!.onComplete()
    expect(screen.getByLabelText('1/27')).toHaveTextContent('1/27')
    rerender(<CountUp value="2/27" />)
    expect(screen.getByLabelText('2/27')).toHaveTextContent('2/27')
  })

  it('valor novo no meio da contagem termina no valor novo', () => {
    const { rerender } = render(<CountUp value="1/27" />)
    h.enter!()
    h.opts!.onUpdate(0.5)
    rerender(<CountUp value="3/27" />)
    expect(h.stop).toHaveBeenCalled()
    expect(screen.getByLabelText('3/27')).toHaveTextContent('3/27')
  })
})
