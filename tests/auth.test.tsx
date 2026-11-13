import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: h.getSession,
      onAuthStateChange: h.onAuthStateChange,
      signInWithPassword: h.signInWithPassword,
      signOut: h.signOut,
    },
    rpc: h.rpc,
    from: h.from,
  },
}))

const session = { user: { id: 'u1', email: 'ana@lasete.org' } }

function tableResult(result: { data: unknown[] | null; error: { message: string } | null }) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    order: () => chain,
    then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(ok, ko),
  }
  return chain
}

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

beforeEach(() => {
  vi.resetAllMocks()
  h.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  h.getSession.mockResolvedValue({ data: { session: null } })
  h.from.mockImplementation(() => tableResult({ data: [], error: null }))
})

describe('login e acesso', () => {
  it('sem sessão mostra a tela de login', async () => {
    renderApp()
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('sessão com access none mostra "Sem acesso" e não carrega dados', async () => {
    h.getSession.mockResolvedValue({ data: { session } })
    h.rpc.mockResolvedValue({ data: 'none', error: null })
    renderApp()
    expect(await screen.findByText(/Sem acesso/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(h.from).not.toHaveBeenCalled()
  })

  it('sessão com access member carrega e mostra o app', async () => {
    h.getSession.mockResolvedValue({ data: { session } })
    h.rpc.mockResolvedValue({ data: 'member', error: null })
    renderApp()
    expect(await screen.findByText('Visão geral')).toBeInTheDocument()
    expect(h.rpc).toHaveBeenCalledWith('current_access')
    expect(h.from).toHaveBeenCalledWith('projects')
  })

  it('senha errada mostra mensagem em português e continua no login', async () => {
    h.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })
    renderApp()
    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@lasete.org')
    await userEvent.type(screen.getByLabelText('Senha'), 'errada')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('falha ao carregar dados mostra erro e "Tentar de novo" recarrega', async () => {
    h.getSession.mockResolvedValue({ data: { session } })
    h.rpc.mockResolvedValue({ data: 'owner', error: null })
    h.from.mockImplementation(() => tableResult({ data: null, error: { message: 'boom' } }))
    renderApp()
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' })
    expect(screen.getByText('Não foi possível carregar os dados.')).toBeInTheDocument()
    h.from.mockImplementation(() => tableResult({ data: [], error: null }))
    await userEvent.click(retry)
    await waitFor(() => expect(screen.getByText('Visão geral')).toBeInTheDocument())
  })
})
