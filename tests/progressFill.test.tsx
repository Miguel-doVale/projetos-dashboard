import '@testing-library/jest-dom/vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProgressFill } from '@/fx/ProgressFill'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProgressFill', () => {
  it('uma mudança de progresso depois do primeiro preenchimento mostra a nova largura', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    vi.stubGlobal('IntersectionObserver', class {
      cb: (e: unknown[]) => void
      constructor(cb: (e: unknown[]) => void) {
        this.cb = cb
      }
      observe(el: Element) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }]) }
      unobserve() {} disconnect() {} takeRecords() { return [] }
    })
    const { container, rerender } = render(<ProgressFill fraction={0.2} />)
    const bar = container.firstElementChild as HTMLElement
    await waitFor(() => expect(bar.style.transform).toContain('scaleX(0.2'), { timeout: 3000 })
    rerender(<ProgressFill fraction={0.8} />)
    await waitFor(() => expect(bar.style.transform).toContain('scaleX(0.8'), { timeout: 3000 })
  })
})
