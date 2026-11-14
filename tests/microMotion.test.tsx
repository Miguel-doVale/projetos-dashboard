import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { DataState } from '@/data/DataProvider'
import { CountUp } from '@/fx/CountUp'
import { SplitTitle } from '@/fx/SplitTitle'
import { usePointerGlow } from '@/fx/usePointerGlow'
import { Header } from '@/shell/Header'

const h = vi.hoisted(() => ({ data: null as unknown }))

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ loading: false, email: 'ana@lasete.org', access: 'owner', accessError: false, retryAccess: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('@/data/DataProvider', () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useData: () => h.data,
}))

const empty: DataState = {
  loading: false, error: null, loaded: true, memberUids: [], adminUids: [], reload: async () => {}, sprints: [], items: [],
  people: [], projects: [], members: [], tasks: [], pages: [],
}
h.data = empty

function stubMedia(opts: { reduce?: boolean; fine?: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') ? Boolean(opts.reduce) : query.includes('hover') ? Boolean(opts.fine) : false,
    media: query, addEventListener() {}, removeEventListener() {},
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CountUp', () => {
  it('com movimento reduzido mostra o valor final na hora; aria-label tem o valor final', () => {
    stubMedia({ reduce: true })
    render(<CountUp value="1/27" />)
    const el = screen.getByLabelText('1/27')
    expect(el).toHaveTextContent('1/27')
  })

  it('com movimento, antes de entrar na tela começa em zero e o aria-label segue com o valor final', () => {
    stubMedia({})
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } })
    render(<CountUp value="1/27" />)
    const el = screen.getByLabelText('1/27')
    expect(el).toHaveTextContent('0/0')
  })
})

describe('SplitTitle', () => {
  it('renderiza o texto completo no título', () => {
    stubMedia({})
    render(<SplitTitle>Onde cada projeto está.</SplitTitle>)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Onde cada projeto está.')
  })
})

describe('EmptyState', () => {
  const at = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )

  it.each([
    ['/tarefas', 'Nenhuma tarefa por aqui.'],
    ['/projetos', 'Nenhum projeto ainda.'],
    ['/pessoas', 'Nenhuma pessoa cadastrada.'],
  ])('aparece em %s sem dados', async (path, text) => {
    at(path)
    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(document.querySelector('[data-empty-state] svg')).not.toBeNull()
  })
})

describe('pílula da navegação', () => {
  it('só a aba ativa tem o fundo com layoutId', () => {
    render(
      <MemoryRouter initialEntries={['/tarefas']}>
        <Header />
      </MemoryRouter>,
    )
    const pills = document.querySelectorAll('[data-nav-pill]')
    expect(pills).toHaveLength(1)
    expect(pills[0].closest('a')).toHaveAttribute('aria-current', 'page')
    expect(pills[0].closest('a')).toHaveTextContent('Tarefas')
  })
})

describe('usePointerGlow', () => {
  function Card({ tilt = true }: { tilt?: boolean }) {
    const glow = usePointerGlow({ tilt })
    return <div data-testid="card" {...glow} />
  }
  const rect = { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0 } as DOMRect

  it('com mouse segue o cursor, inclina até 3° e volta ao sair', () => {
    stubMedia({ fine: true })
    render(<Card />)
    const card = screen.getByTestId('card')
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(rect)
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' })
    expect(card.style.getPropertyValue('--mx')).toBe('200px')
    expect(card.style.getPropertyValue('--ry')).toBe('3.00deg')
    expect(card.style.getPropertyValue('--rx')).toBe('3.00deg')
    fireEvent.pointerLeave(card)
    expect(card.style.getPropertyValue('--rx')).toBe('0deg')
    expect(card.style.getPropertyValue('--glow')).toBe('0')
  })

  it('sem mouse fino ou com movimento reduzido não faz nada', () => {
    stubMedia({ fine: false })
    const { unmount } = render(<Card />)
    let card = screen.getByTestId('card')
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(rect)
    fireEvent.pointerMove(card, { clientX: 50, clientY: 50, pointerType: 'mouse' })
    expect(card.style.getPropertyValue('--mx')).toBe('')
    unmount()
    stubMedia({ fine: true, reduce: true })
    render(<Card />)
    card = screen.getByTestId('card')
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(rect)
    fireEvent.pointerMove(card, { clientX: 50, clientY: 50, pointerType: 'mouse' })
    expect(card.style.getPropertyValue('--mx')).toBe('')
  })

  it('tilt: false só move o brilho', () => {
    stubMedia({ fine: true })
    render(<Card tilt={false} />)
    const card = screen.getByTestId('card')
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue(rect)
    fireEvent.pointerMove(card, { clientX: 100, clientY: 50, pointerType: 'mouse' })
    expect(card.style.getPropertyValue('--mx')).toBe('100px')
    expect(card.style.getPropertyValue('--ry')).toBe('')
  })
})

describe('checkbox', () => {
  it('o traço só se desenha depois de o usuário marcar, não quando já nasce marcado', async () => {
    const { Checkbox } = await import('@/components/ui/checkbox')
    const { default: userEvent } = await import('@testing-library/user-event')
    render(<Checkbox defaultChecked aria-label="a" />)
    expect(document.querySelector('.check-stroke')).toBeNull()
    expect(document.querySelector('[data-slot="checkbox-indicator"] path')).not.toBeNull()
    cleanup()
    render(<Checkbox aria-label="b" />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'b' }))
    expect(document.querySelector('.check-stroke')).not.toBeNull()
  })
})
