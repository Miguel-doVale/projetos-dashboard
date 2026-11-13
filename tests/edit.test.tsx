import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { DataState } from '@/data/DataProvider'
import type { Page, Person, Project, Task, TaskItem } from '@/lib/types'

const h = vi.hoisted(() => ({
  data: null as unknown,
  access: 'owner' as 'owner' | 'member',
  reload: vi.fn(async () => {}),
  save: vi.fn(),
  remove: vi.fn(),
  setProjectTeam: vi.fn(),
  setMemberAccess: vi.fn(),
}))

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ loading: false, email: 'dono@lasete.org', access: h.access, signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('@/data/DataProvider', () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useData: () => h.data,
}))
vi.mock('@/lib/api', () => ({
  save: (...a: unknown[]) => h.save(...a),
  remove: (...a: unknown[]) => h.remove(...a),
  setProjectTeam: (...a: unknown[]) => h.setProjectTeam(...a),
  setMemberAccess: (...a: unknown[]) => h.setMemberAccess(...a),
  setItemDone: vi.fn(),
  setTaskStatus: vi.fn(),
}))

const person = (id: string, name: string, over: Partial<Person> = {}): Person => ({
  id, created_at: null, name, role: null, area: null, email: null, uid: null, ...over,
})
const project = (id: string, position: number, title: string): Project => ({
  id, created_at: null, position, number: String(position).padStart(2, '0'), title, kind: 'projeto',
  status_level: 'on', status_label: 'Em andamento', summary: null, deadline: null, facts: [], sections: [],
})
const task = (id: string, project_id: string, position: number): Task => ({
  id, created_at: null, project_id, title: `Tarefa ${id}`, description: null, status: 'todo',
  assignee_id: null, sprint_id: null, due_on: null, position,
})

const base = {
  loading: false, error: null, loaded: true, memberUids: [], members: [], sprints: [],
  people: [person('a', 'Ana Souza'), person('b', 'Beto Lima')],
  projects: [project('p1', 1, 'Portal'), project('p2', 4, 'Gadget')],
  tasks: [task('t1', 'p1', 2), task('t2', 'p1', 7)],
  items: [] as TaskItem[],
  pages: [{ id: 'g1', created_at: null, position: 3, slug: 'plano', title: 'Plano', blocks: [] } as Page],
}

// O Checkbox do Radix observa o tamanho quando está dentro de um <form>.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const go = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
const user = () => userEvent.setup()
const hasUndefined = (v: unknown): boolean =>
  v === undefined || (typeof v === 'object' && v !== null && Object.values(v).some(hasUndefined))

beforeEach(() => {
  h.access = 'owner'
  h.data = { ...base, reload: h.reload } as DataState
  h.reload.mockClear()
  h.save.mockReset().mockImplementation(async (_t: string, row: object) => ({ id: 'novo', ...row }))
  h.remove.mockReset().mockResolvedValue(undefined)
  h.setProjectTeam.mockReset().mockResolvedValue(undefined)
  h.setMemberAccess.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('quem vê os controles', () => {
  const entries: [string, string][] = [
    ['/projetos', 'Novo projeto'],
    ['/tarefas', 'Nova tarefa'],
    ['/pessoas', 'Nova pessoa'],
    ['/', 'Nova aba'],
  ]
  it.each(entries)('dono vê "%s" -> %s', async (path, name) => {
    go(path)
    expect(await screen.findByRole('button', { name })).toBeInTheDocument()
  })
  it.each(entries)('membro não vê "%s" -> %s', async (path, name) => {
    h.access = 'member'
    go(path)
    await screen.findByRole('navigation', { name: 'Principal' })
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar|excluir|sprints/i })).not.toBeInTheDocument()
  })
})

describe('projeto', () => {
  it('sem título mostra o erro e não salva', async () => {
    const u = user()
    go('/projetos')
    await u.click(await screen.findByRole('button', { name: 'Novo projeto' }))
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Informe o título.')).toBeInTheDocument()
    expect(h.save).not.toHaveBeenCalled()
  })

  it('cria com position = maior + 1 e campos opcionais em branco como null', async () => {
    const u = user()
    go('/projetos')
    await u.click(await screen.findByRole('button', { name: 'Novo projeto' }))
    await u.type(screen.getByLabelText('Título'), 'Novo')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.save).toHaveBeenCalledTimes(1))
    const [table, row] = h.save.mock.calls[0]
    expect(table).toBe('projects')
    expect(row).toMatchObject({ title: 'Novo', position: 5, summary: null, deadline: null, facts: [], sections: [] })
    expect(row.id).toBeUndefined()
    expect(hasUndefined(row)).toBe(false)
    expect(h.setProjectTeam).toHaveBeenCalledWith('novo', [])
    expect(h.reload).toHaveBeenCalled()
  })

  it('equipe: uma só frente e ninguém repetido; salva com setProjectTeam', async () => {
    const u = user()
    go('/projetos')
    await u.click(await screen.findByRole('button', { name: 'Novo projeto' }))
    await u.type(screen.getByLabelText('Título'), 'Com equipe')
    await u.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
    await u.selectOptions(screen.getByLabelText('Pessoa 1'), 'a')
    await u.click(screen.getByRole('button', { name: 'Adicionar pessoa' }))
    const second = screen.getByLabelText('Pessoa 2')
    expect(within(second).queryByRole('option', { name: 'Ana Souza' })).not.toBeInTheDocument()
    await u.selectOptions(second, 'b')
    await u.click(screen.getByRole('checkbox', { name: 'Frente 1' }))
    await u.click(screen.getByRole('checkbox', { name: 'Frente 2' }))
    expect(screen.getByRole('checkbox', { name: 'Frente 1' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Frente 2' })).toBeChecked()
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(h.setProjectTeam).toHaveBeenCalledWith('novo', [
        { person_id: 'a', role: null, is_lead: false },
        { person_id: 'b', role: null, is_lead: true },
      ]),
    )
  })

  it('seções: monta bloco pelo texto e reordena', async () => {
    const u = user()
    go('/projetos')
    await u.click(await screen.findByRole('button', { name: 'Novo projeto' }))
    await u.type(screen.getByLabelText('Título'), 'Com seções')
    await u.click(screen.getByRole('button', { name: 'Adicionar seção' }))
    await u.type(screen.getByLabelText('Título da seção'), 'Escopo')
    await u.selectOptions(screen.getByLabelText('Tipo do bloco 1 da seção 1'), 'list')
    await u.type(screen.getByLabelText('Conteúdo do bloco 1 da seção 1'), 'um{Enter}dois')
    await u.click(screen.getByRole('button', { name: 'Adicionar seção' }))
    await u.click(screen.getByRole('button', { name: 'Subir seção 2' }))
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.save).toHaveBeenCalled())
    // A segunda seção sobe para o topo; a do Escopo mantém o seu conteúdo.
    const sections = h.save.mock.calls[0][1].sections
    expect(sections).toContainEqual({ title: 'Escopo', blocks: [{ type: 'list', items: ['um', 'dois'] }] })
    expect(hasUndefined(sections)).toBe(false)
  })

  it('erro do save aparece e o formulário continua com os dados', async () => {
    const u = user()
    h.save.mockRejectedValueOnce(new Error('Você não tem permissão para fazer isso.'))
    go('/projetos')
    await u.click(await screen.findByRole('button', { name: 'Novo projeto' }))
    await u.type(screen.getByLabelText('Título'), 'Vai falhar')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Você não tem permissão para fazer isso.')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Vai falhar')
    expect(h.reload).not.toHaveBeenCalled()
  })

  it('apagar pede confirmação citando o nome; cancelar não remove', async () => {
    const u = user()
    go('/projetos/p1')
    await u.click(await screen.findByRole('button', { name: 'Excluir projeto' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/Portal/)).toBeInTheDocument()
    expect(within(dialog).getByText(/As tarefas e a equipe deste projeto também serão apagadas\./)).toBeInTheDocument()
    await u.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    expect(h.remove).not.toHaveBeenCalled()

    await u.click(screen.getByRole('button', { name: 'Excluir projeto' }))
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }))
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith('projects', 'p1'))
    expect(h.reload).toHaveBeenCalled()
  })
})

describe('tarefa', () => {
  it('cria com itens de escopo e de teste em position sequencial', async () => {
    const u = user()
    go('/tarefas')
    await u.click(await screen.findByRole('button', { name: 'Nova tarefa' }))
    await u.type(screen.getByLabelText('Título'), 'Nova coisa')
    await u.click(screen.getByRole('button', { name: 'Adicionar item de escopo' }))
    await u.type(screen.getByLabelText('Escopo: item 1'), 'Layout{Enter}')
    await u.keyboard('Código')
    await u.click(screen.getByRole('button', { name: 'Adicionar item de testes' }))
    await u.type(screen.getByLabelText('Testes: item 1'), 'Abre no celular')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.save).toHaveBeenCalledTimes(4))
    const calls = h.save.mock.calls
    expect(calls[0][0]).toBe('tasks')
    // Projeto padrão é o primeiro (p1): maior position nele é 7.
    expect(calls[0][1]).toMatchObject({ project_id: 'p1', title: 'Nova coisa', position: 8, status: 'todo' })
    expect(calls.slice(1).map((c) => [c[0], c[1].kind, c[1].text, c[1].position, c[1].task_id, c[1].done])).toEqual([
      ['task_items', 'scope', 'Layout', 0, 'novo', false],
      ['task_items', 'scope', 'Código', 1, 'novo', false],
      ['task_items', 'test', 'Abre no celular', 2, 'novo', false],
    ])
  })

  it('campos opcionais em branco vão como null', async () => {
    const u = user()
    go('/tarefas')
    await u.click(await screen.findByRole('button', { name: 'Nova tarefa' }))
    await u.type(screen.getByLabelText('Título'), 'Só título')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.save).toHaveBeenCalled())
    const row = h.save.mock.calls[0][1]
    expect(row).toMatchObject({ description: null, assignee_id: null, sprint_id: null, due_on: null })
    expect(hasUndefined(row)).toBe(false)
  })
})

describe('pessoa', () => {
  it('sem UID, marcar membro mostra o erro e não salva', async () => {
    const u = user()
    go('/pessoas')
    await u.click(await screen.findByRole('button', { name: 'Nova pessoa' }))
    await u.type(screen.getByLabelText('Nome'), 'Carla')
    await u.click(screen.getByRole('checkbox', { name: 'Pode entrar no dashboard (membro)' }))
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Informe o UID do login desta pessoa.')).toBeInTheDocument()
    expect(h.save).not.toHaveBeenCalled()
  })

  it('em branco manda null e não chama setMemberAccess', async () => {
    const u = user()
    go('/pessoas')
    await u.click(await screen.findByRole('button', { name: 'Nova pessoa' }))
    await u.type(screen.getByLabelText('Nome'), 'Carla')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.save).toHaveBeenCalled())
    const row = h.save.mock.calls[0][1]
    expect(row).toEqual({ name: 'Carla', role: null, area: null, email: null, uid: null })
    expect(h.setMemberAccess).not.toHaveBeenCalled()
  })

  it('com UID e membro marcado concede acesso', async () => {
    const u = user()
    go('/pessoas')
    await u.click(await screen.findByRole('button', { name: 'Nova pessoa' }))
    await u.type(screen.getByLabelText('Nome'), 'Carla')
    await u.type(screen.getByLabelText('UID do login'), 'uid-9')
    await u.click(screen.getByRole('checkbox', { name: 'Pode entrar no dashboard (membro)' }))
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.setMemberAccess).toHaveBeenCalled())
    expect(h.setMemberAccess.mock.calls[0][0]).toMatchObject({ id: 'novo', uid: 'uid-9' })
    expect(h.setMemberAccess.mock.calls[0][1]).toBe(true)
  })
})

describe('sprint', () => {
  it('cria sprint com datas vazias como null', async () => {
    const u = user()
    go('/tarefas')
    await u.click(await screen.findByRole('button', { name: 'Sprints' }))
    await u.type(screen.getByLabelText('Nome da sprint'), 'Sprint 1')
    await u.click(screen.getByRole('button', { name: 'Criar sprint' }))
    await waitFor(() => expect(h.save).toHaveBeenCalledWith('sprints', { name: 'Sprint 1', starts_on: null, ends_on: null }))
  })
})

describe('aba', () => {
  it('gera o slug do título e não aceita repetido', async () => {
    const u = user()
    go('/')
    await u.click(await screen.findByRole('button', { name: 'Nova aba' }))
    await u.type(screen.getByLabelText('Título'), 'Reunião geral')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(h.save).toHaveBeenCalled())
    expect(h.save.mock.calls[0][0]).toBe('pages')
    expect(h.save.mock.calls[0][1]).toMatchObject({ title: 'Reunião geral', slug: 'reuniao-geral', position: 4, blocks: [] })
  })

  it('slug repetido é recusado', async () => {
    const u = user()
    go('/')
    await u.click(await screen.findByRole('button', { name: 'Nova aba' }))
    await u.type(screen.getByLabelText('Título'), 'Plano')
    await u.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/Já existe uma aba/)).toBeInTheDocument()
    expect(h.save).not.toHaveBeenCalled()
  })
})
