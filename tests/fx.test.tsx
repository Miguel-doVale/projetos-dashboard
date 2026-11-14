import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LiveBackground } from '@/fx/LiveBackground'
import Overview from '@/screens/Overview'
import type { Project, ProjectMember } from '@/lib/types'

const h = vi.hoisted(() => ({ data: null as unknown }))
vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ access: 'owner' }) }))
vi.mock('@/data/DataProvider', () => ({ useData: () => h.data }))
vi.mock('@/data/ImportSeedButton', () => ({ ImportSeedButton: () => null }))

const project = (id: string, position: number): Project => ({
  id, created_at: null, position, number: `0${position}`, title: `Projeto ${id}`, kind: 'projeto',
  status_level: 'on', status_label: 'Em andamento', summary: null, deadline: null, facts: [], sections: [],
})
h.data = {
  projects: [project('p1', 1), project('p2', 2)],
  members: [] as ProjectMember[], tasks: [], people: [], memberUids: [], adminUids: [],
}

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {},
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('constelação sem WebGL', () => {
  it('mostra o fallback com um elemento clicável por projeto e navega ao clicar', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/projetos/:id" element={<p>Página do projeto</p>} />
        </Routes>
      </MemoryRouter>,
    )
    const dots = document.querySelectorAll('svg[aria-label="Constelação dos projetos"] circle[data-project]')
    expect(dots).toHaveLength(2)
    await userEvent.click(dots[1])
    expect(await screen.findByText('Página do projeto')).toBeInTheDocument()
  })

  it('sem projetos não renderiza a constelação', () => {
    h.data = { ...(h.data as object), projects: [] }
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>,
    )
    expect(screen.queryByLabelText('Constelação dos projetos')).toBeNull()
    h.data = { ...(h.data as object), projects: [project('p1', 1), project('p2', 2)] }
  })
})

describe('LiveBackground', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D,
    )
  })

  it('com movimento reduzido não agenda requestAnimationFrame', () => {
    stubMatchMedia(true)
    const raf = vi.fn(() => 1)
    vi.stubGlobal('requestAnimationFrame', raf)
    render(<LiveBackground />)
    expect(raf).not.toHaveBeenCalled()
  })

  it('ao desmontar cancela o quadro agendado e remove o listener de resize', () => {
    stubMatchMedia(false)
    const raf = vi.fn(() => 42)
    const caf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', caf)
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<LiveBackground />)
    expect(raf).toHaveBeenCalled()
    const onResize = add.mock.calls.find(([type]) => type === 'resize')?.[1]
    expect(onResize).toBeTypeOf('function')
    unmount()
    expect(caf).toHaveBeenCalledWith(42)
    expect(remove).toHaveBeenCalledWith('resize', onResize)
  })
})
