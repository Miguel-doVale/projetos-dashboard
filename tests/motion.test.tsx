import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  lenisCtor: vi.fn(),
  kill: vi.fn(),
  create: vi.fn(),
}))

vi.mock('lenis', () => ({
  default: class {
    constructor() {
      h.lenisCtor()
    }
    on() {}
    raf() {}
    stop() {}
    start() {}
    scrollTo() {}
    destroy() {}
  },
}))
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { update: vi.fn(), create: h.create },
}))

import { useReveal, useSmoothScroll } from '@/lib/motion'

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({ matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  )
}

function Probe({ dep }: { dep: string }) {
  useSmoothScroll()
  useReveal(dep)
  return (
    <main>
      <p data-reveal>A</p>
      <p data-reveal>B</p>
    </main>
  )
}

beforeEach(() => {
  h.lenisCtor.mockClear()
  h.kill.mockClear()
  h.create.mockReset()
  h.create.mockImplementation(() => ({ kill: h.kill }))
  // jsdom devolve rect zerado: força "abaixo da dobra" para os alvos serem escondidos.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('movimento', () => {
  it('sem matchMedia fica inerte', () => {
    const { getAllByText } = render(<Probe dep="a" />)
    expect(h.lenisCtor).not.toHaveBeenCalled()
    expect(getAllByText(/^[AB]$/)[0]).toBeVisible()
  })

  it('com prefers-reduced-motion não cria Lenis nem esconde nada', () => {
    stubMatchMedia(true)
    const { getByText } = render(<Probe dep="a" />)
    expect(h.lenisCtor).not.toHaveBeenCalled()
    expect(h.create).not.toHaveBeenCalled()
    expect(getByText('A')).toBeVisible()
    expect(getByText('B')).toBeVisible()
  })

  it('sem reduced-motion, o cleanup do useReveal mata os triggers quando dep muda', () => {
    stubMatchMedia(false)
    const { rerender, getByText } = render(<Probe dep="a" />)
    expect(h.lenisCtor).toHaveBeenCalledTimes(1)
    expect(h.create).toHaveBeenCalledTimes(2)
    expect(h.kill).not.toHaveBeenCalled()
    expect(getByText('A')).not.toBeVisible()
    rerender(<Probe dep="b" />)
    expect(h.kill).toHaveBeenCalledTimes(2)
    expect(h.create).toHaveBeenCalledTimes(4)
    expect(getByText('A')).toBeInTheDocument()
  })
})
