import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { DataState } from '@/data/DataProvider'
import type { Page, Person, Project, ProjectMember, Task } from '@/lib/types'

const h = vi.hoisted(() => ({ data: null as unknown }))

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ loading: false, email: 'ana@lasete.org', access: 'owner', signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('@/data/DataProvider', () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useData: () => h.data,
}))

const person = (id: string, name: string, role: string | null, area: string | null): Person => ({
  id, created_at: null, name, role, area, email: null, access: 'member',
})
const project = (id: string, position: number, title: string, over: Partial<Project> = {}): Project => ({
  id, created_at: null, position, number: String(position).padStart(2, '0'), title, kind: 'projeto',
  status_level: 'on', status_label: 'Em andamento', summary: `Resumo de ${title}`, deadline: null,
  facts: [], sections: [], ...over,
})

const base: DataState = {
  loading: false, error: null, reload: async () => {}, sprints: [], items: [],
  people: [person('a', 'Ana Souza', 'Dev', 'Projetos'), person('b', 'Beto Lima', null, null)],
  projects: [
    project('p2', 2, 'Segundo'),
    project('p1', 1, 'Primeiro', {
      sections: [
        { title: 'Escopo', blocks: [{ type: 'list', items: ['Item um'] }] },
        { title: 'Estranha', blocks: [{ type: 'nova' } as never] },
      ],
    }),
    project('vazio', 3, 'Vazio'),
  ],
  members: [{ id: 'm1', created_at: null, project_id: 'p1', person_id: 'a', role: 'Frontend', is_lead: true } as ProjectMember],
  tasks: [
    { id: 't1', created_at: null, project_id: 'p1', title: 'Montar header', description: null, status: 'doing', assignee_id: 'a', sprint_id: null, due_on: null, position: 1 } as Task,
  ],
  pages: [
    { id: 'g1', created_at: null, position: 1, slug: 'plano', title: 'Plano de atividades', blocks: [{ title: 'Marcos', blocks: [{ type: 'text', text: 'Texto do plano' }] }] } as Page,
  ],
}
// A ordem de `projects` vem do DataProvider já ordenada por position.
h.data = { ...base, projects: [base.projects[1], base.projects[0], base.projects[2]] }

function go(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}
afterEach(cleanup)

describe('telas de leitura', () => {
  it('Visão geral lista os projetos na ordem de position', () => {
    go('/')
    const rows = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(rows[0]).toContain('Primeiro')
    expect(rows[1]).toContain('Segundo')
  })

  it('Projetos mostra um card por projeto e clicar navega', async () => {
    go('/projetos')
    expect(screen.getAllByRole('link', { name: /Resumo de/ })).toHaveLength(3)
    await userEvent.click(screen.getByRole('link', { name: /Resumo de Primeiro/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Primeiro' })).toBeInTheDocument()
  })

  it('página do projeto mostra resumo, equipe, seções e tarefas', () => {
    go('/projetos/p1')
    expect(screen.getByText('Resumo de Primeiro')).toBeInTheDocument()
    const team = screen.getByRole('heading', { name: 'Equipe' }).closest('section')!
    expect(within(team).getByText('Ana Souza')).toBeInTheDocument()
    expect(within(team).getByText(/Frontend/)).toBeInTheDocument()
    expect(screen.getByText('Item um')).toBeInTheDocument()
    const tasks = screen.getByRole('heading', { name: 'Tarefas' }).closest('section')!
    expect(within(tasks).getByText('Montar header')).toBeInTheDocument()
    expect(within(tasks).getByText('Fazendo')).toBeInTheDocument()
    expect(within(tasks).getByText('Ana Souza')).toBeInTheDocument()
  })

  it('projeto sem equipe, seções e tarefas não mostra títulos vazios', () => {
    go('/projetos/vazio')
    expect(screen.getByRole('heading', { level: 1, name: 'Vazio' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Equipe' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tarefas' })).not.toBeInTheDocument()
  })

  it('projeto inexistente mostra aviso com link de volta', () => {
    go('/projetos/id-inexistente')
    expect(screen.getByText('Projeto não encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Voltar/ })).toHaveAttribute('href', '/projetos')
  })

  it('Pessoas agrupa por area e usa "Sem diretoria"', () => {
    go('/pessoas')
    const projetos = screen.getByRole('heading', { name: 'Projetos' }).closest('section')!
    expect(within(projetos).getByText('Ana Souza')).toBeInTheDocument()
    const sem = screen.getByRole('heading', { name: 'Sem diretoria' }).closest('section')!
    expect(within(sem).getByText('Beto Lima')).toBeInTheDocument()
  })

  it('bloco de tipo desconhecido não lança', () => {
    expect(() => go('/projetos/p1')).not.toThrow()
    expect(screen.getByText('Estranha')).toBeInTheDocument()
  })

  it('aba livre aparece na navegação e /p/plano mostra os blocos', async () => {
    go('/p/plano')
    expect(screen.getByText('Texto do plano')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: 'Plano de atividades' })).toHaveAttribute('aria-current', 'page')
  })

  it('/tarefas mostra o título e rota desconhecida volta para /', () => {
    go('/tarefas')
    expect(screen.getByRole('heading', { name: 'Tarefas' })).toBeInTheDocument()
    cleanup()
    go('/nada')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Onde cada projeto está.')
  })
})
