import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { AuthProvider } from '@/auth/AuthProvider'
import { DataProvider, useData } from '@/data/DataProvider'
import * as fake from './helpers/fakeFirestore'

const h = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: h.onAuthStateChanged,
  signInWithEmailAndPassword: h.signInWithEmailAndPassword,
  signOut: h.signOut,
}))
vi.mock('firebase/firestore', async () => await import('./helpers/fakeFirestore'))

const user = { uid: 'u1', email: 'ana@lasete.org' }

/** Simula o Firebase Auth: chama o callback com o usuário (ou null) e devolve o "unsubscribe". */
function signedInAs(u: typeof user | null) {
  h.onAuthStateChanged.mockImplementation((_auth: unknown, next: (v: typeof user | null) => void) => {
    queueMicrotask(() => next(u))
    return vi.fn()
  })
}

const renderApp = () =>
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

beforeEach(() => {
  vi.resetAllMocks()
  fake.reset()
  signedInAs(null)
})

describe('login e acesso', () => {
  it('sem sessão mostra a tela de login', async () => {
    renderApp()
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('UID igual a VITE_OWNER_UID é dono: carrega o app sem consultar members/{uid}', async () => {
    vi.stubEnv('VITE_OWNER_UID', 'u1')
    signedInAs(user)
    renderApp()
    expect(await screen.findByText('Visão geral')).toBeInTheDocument()
    expect(fake.reads).toContain('projects')
  })

  it('members/{uid} existe: membro carrega o app e não lista members', async () => {
    fake.seed('members', 'u1', { person_id: 'x' })
    signedInAs(user)
    renderApp()
    expect(await screen.findByText('Visão geral')).toBeInTheDocument()
    expect(fake.reads.filter((c) => c === 'members')).toHaveLength(1) // só o getDoc do próprio UID
    expect(fake.reads).toContain('projects')
  })

  it('nem dono nem membro mostra "Sem acesso" e não lê nenhuma coleção de dados', async () => {
    signedInAs(user)
    renderApp()
    expect(await screen.findByText(/Sem acesso/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(fake.reads.filter((c) => c !== 'members')).toEqual([])
  })

  it('erro de permissão ao ler members/{uid} vira "Sem acesso"', async () => {
    fake.failReads.set('members', Object.assign(new Error('x'), { code: 'permission-denied' }))
    signedInAs(user)
    renderApp()
    expect(await screen.findByText(/Sem acesso/)).toBeInTheDocument()
  })

  it.each(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'])(
    '%s mostra "E-mail ou senha incorretos." e continua no login',
    async (code) => {
      h.signInWithEmailAndPassword.mockRejectedValue({ code })
      renderApp()
      await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@lasete.org')
      await userEvent.type(screen.getByLabelText('Senha'), 'errada')
      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      expect(await screen.findByText('E-mail ou senha incorretos.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    },
  )

  it('too-many-requests e erro desconhecido têm mensagens próprias', async () => {
    renderApp()
    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@lasete.org')
    await userEvent.type(screen.getByLabelText('Senha'), 'x')
    h.signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/too-many-requests' })
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Muitas tentativas. Tente de novo em alguns minutos.')).toBeInTheDocument()
    h.signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Não foi possível entrar. Tente de novo.')).toBeInTheDocument()
  })

  it('falha ao carregar dados mostra erro; "Tentar de novo" volta a "Carregando…" antes do app', async () => {
    vi.stubEnv('VITE_OWNER_UID', 'u1')
    signedInAs(user)
    fake.failReads.set('projects', new Error('boom'))
    renderApp()
    const retry = await screen.findByRole('button', { name: 'Tentar de novo' })
    expect(screen.getByText('Não foi possível carregar os dados.')).toBeInTheDocument()

    fake.failReads.clear()
    let release!: () => void
    fake.holds.push(new Promise<void>((resolve) => (release = resolve)))
    await userEvent.click(retry)
    expect(await screen.findByText('Carregando…')).toBeInTheDocument()
    expect(screen.queryByText('Visão geral')).not.toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar os dados.')).not.toBeInTheDocument()
    release()
    expect(await screen.findByText('Visão geral')).toBeInTheDocument()
  })
})

describe('DataProvider', () => {
  let reload!: () => Promise<void>

  function Probe() {
    const data = useData()
    reload = data.reload
    return (
      <div>
        <p>projetos: {data.projects.map((p) => p.title).join(',')}</p>
        <p>carregando: {String(data.loading)}</p>
        <p>erro: {data.error ?? 'nenhum'}</p>
      </div>
    )
  }

  function mount() {
    vi.stubEnv('VITE_OWNER_UID', 'u1')
    signedInAs(user)
    fake.seed('projects', 'a', { title: 'Antigo', position: 1 })
    return render(
      <AuthProvider>
        <DataProvider>
          <Probe />
        </DataProvider>
      </AuthProvider>,
    )
  }

  it('reload() que falha com dados já carregados mantém os dados e só preenche o erro', async () => {
    mount()
    expect(await screen.findByText('projetos: Antigo')).toBeInTheDocument()
    fake.failReads.set('projects', new Error('boom'))
    await act(() => reload())
    expect(screen.getByText('projetos: Antigo')).toBeInTheDocument()
    expect(screen.getByText('carregando: false')).toBeInTheDocument()
    expect(screen.getByText('erro: Não foi possível carregar os dados.')).toBeInTheDocument()
  })

  it('resposta fora de ordem não sobrescreve a mais recente', async () => {
    mount()
    expect(await screen.findByText('projetos: Antigo')).toBeInTheDocument()
    let release!: () => void
    fake.holds.push(new Promise<void>((resolve) => (release = resolve)))
    let slow!: Promise<void>
    act(() => {
      slow = reload() // lê "Antigo" e fica presa
    })
    await waitFor(() => expect(fake.holds).toHaveLength(0))
    fake.seed('projects', 'a', { title: 'Novo', position: 1 })
    await act(() => reload())
    expect(screen.getByText('projetos: Novo')).toBeInTheDocument()
    await act(async () => {
      release()
      await slow
    })
    expect(screen.getByText('projetos: Novo')).toBeInTheDocument()
  })
})
