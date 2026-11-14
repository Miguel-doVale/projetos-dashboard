import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import type { DataState } from '@/data/DataProvider'
import type { Task, TaskItem } from '@/lib/types'

const h = vi.hoisted(() => ({
  data: null as unknown,
  reload: vi.fn(async () => {}),
  setItemDone: vi.fn(async (_id: string, _done: boolean) => {}),
  setTaskStatus: vi.fn(async (_id: string, _s: string) => {}),
}))

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ loading: false, email: 'bia@lasete.org', access: 'member', signIn: vi.fn(), signOut: vi.fn() }),
}))
vi.mock('@/data/DataProvider', () => ({
  DataProvider: ({ children }: { children: React.ReactNode }) => children,
  useData: () => h.data,
}))
vi.mock('@/lib/api', () => ({
  setItemDone: (id: string, done: boolean) => h.setItemDone(id, done),
  setTaskStatus: (id: string, s: string) => h.setTaskStatus(id, s),
}))

const task = (id: string, title: string, over: Partial<Task> = {}): Task => ({
  id, created_at: null, project_id: 'p1', title, description: null, status: 'todo',
  assignee_id: null, sprint_id: null, due_on: null, position: 0, ...over,
})
const item = (id: string, task_id: string, kind: 'scope' | 'test', text: string, done = false, position = 0): TaskItem => ({
  id, created_at: null, task_id, kind, text, done, position,
})

const person = { created_at: null, role: null, area: null, email: null, uid: null }
const project = { created_at: null, kind: 'projeto' as const, status_level: 'on' as const, status_label: 'x', summary: null, deadline: null, facts: [], sections: [] }

const base = {
  loading: false, error: null, loaded: true, memberUids: [], members: [], pages: [],
  people: [{ ...person, id: 'a', name: 'Ana Souza' }],
  projects: [
    { ...project, id: 'p1', position: 1, number: '01', title: 'Portal' },
    { ...project, id: 'p2', position: 2, number: '02', title: 'Gadget' },
  ],
  sprints: [{ id: 's1', created_at: null, name: 'Sprint 1', starts_on: null, ends_on: null }],
  tasks: [
    task('t1', 'Montar header', { assignee_id: 'a', sprint_id: 's1', status: 'doing', description: 'Cabeçalho fixo' }),
    task('t2', 'Escrever testes', { status: 'todo', position: 1 }),
    task('t3', 'Publicar', { project_id: 'p2', status: 'done' }),
  ],
  items: [
    item('i1', 't1', 'scope', 'Logo', true, 1),
    item('i2', 't1', 'scope', 'Menu', false, 2),
    item('i3', 't1', 'test', 'Navegação por teclado', true, 3),
    item('i4', 't1', 'test', 'Responsivo', false, 4),
    item('i5', 't1', 'test', 'Contraste', false, 5),
  ],
}

function Where() {
  const l = useLocation()
  return <output data-testid="where">{l.pathname + l.search}</output>
}
function go(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  )
}
const where = () => screen.getByTestId('where').textContent

beforeEach(() => {
  h.data = { ...base, reload: h.reload } as DataState
  h.reload.mockClear()
  h.setItemDone.mockReset().mockResolvedValue(undefined)
  h.setTaskStatus.mockReset().mockResolvedValue(undefined)
})
afterEach(cleanup)

describe('Tarefas', () => {
  it('a lista agrupa por projeto e mostra responsável, sprint e progresso dos itens', () => {
    go('/tarefas')
    const row = screen.getByRole('button', { name: /Montar header/ })
    expect(row.closest('section')).toHaveAccessibleName('Portal')
    expect(row).toHaveTextContent('Ana Souza')
    expect(row).toHaveTextContent('Sprint 1')
    expect(row).toHaveTextContent('2/5')
    expect(screen.getByRole('button', { name: /Publicar/ }).closest('section')).toHaveAccessibleName('Gadget')
    // Cada grupo mostra quantas tarefas do projeto estão feitas.
    expect(screen.getByRole('region', { name: 'Gadget' })).toHaveTextContent('1/1')
    // Tarefa sem itens não mostra contador.
    expect(screen.getByRole('button', { name: /Escrever testes/ })).not.toHaveTextContent('0/0')
    expect(screen.getByRole('button', { name: /Escrever testes/ })).not.toHaveTextContent(/\d\/\d/)
  })

  it('alternar para Quadro mostra as colunas com as tarefas certas', async () => {
    go('/tarefas')
    await userEvent.click(screen.getByRole('button', { name: 'Quadro' }))
    expect(where()).toBe('/tarefas?v=quadro')
    const col = (name: string) => screen.getByRole('region', { name })
    expect(within(col('A fazer')).getByText('Escrever testes')).toBeInTheDocument()
    expect(within(col('Fazendo')).getByText('Montar header')).toBeInTheDocument()
    expect(within(col('Feito')).getByText('Publicar')).toBeInTheDocument()
    expect(within(col('Feito')).queryByText('Montar header')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
    expect(where()).toBe('/tarefas')
  })

  it('filtros vêm da URL', () => {
    go('/tarefas?projeto=p2&status=done')
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Montar header/ })).not.toBeInTheDocument()
  })

  it('clicar numa tarefa abre o painel com ?t e fechar remove', async () => {
    go('/tarefas?v=quadro')
    await userEvent.click(screen.getByRole('button', { name: /Montar header/ }))
    expect(where()).toBe('/tarefas?v=quadro&t=t1')
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Cabeçalho fixo')).toBeInTheDocument()
    expect(within(dialog).getByRole('region', { name: 'Escopo' })).toHaveTextContent('1/2')
    expect(within(dialog).getByRole('region', { name: 'Testes' })).toHaveTextContent('1/3')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(where()).toBe('/tarefas?v=quadro')
  })

  it('abre o painel a partir de ?t= também na página do projeto', async () => {
    go('/projetos/p1?t=t1')
    expect(screen.getByRole('dialog')).toHaveTextContent('Montar header')
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(where()).toBe('/projetos/p1')
  })

  it('?t= de tarefa inexistente não abre painel e não lança', () => {
    expect(() => go('/tarefas?t=nao-existe')).not.toThrow()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('membro marca um item: setItemDone(id, true) e depois reload', async () => {
    go('/tarefas?t=t1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Menu' }))
    expect(h.setItemDone).toHaveBeenCalledWith('i2', true)
    await waitFor(() => expect(h.reload).toHaveBeenCalledTimes(1))
    expect(h.setItemDone.mock.invocationCallOrder[0]).toBeLessThan(h.reload.mock.invocationCallOrder[0])
  })

  it('o item aparece marcado na hora, antes de a chamada terminar', async () => {
    let finish: () => void = () => {}
    h.setItemDone.mockImplementation(() => new Promise<void>((r) => (finish = r)))
    go('/tarefas?t=t1')
    const box = screen.getByRole('checkbox', { name: 'Menu' })
    await userEvent.click(box)
    expect(box).toBeChecked()
    expect(screen.getByRole('region', { name: 'Escopo' })).toHaveTextContent('2/2')
    finish()
    await waitFor(() => expect(h.reload).toHaveBeenCalled())
  })

  it('membro muda o status pelo menu: setTaskStatus(id, "doing")', async () => {
    go('/tarefas?t=t2')
    await userEvent.click(screen.getByRole('button', { name: /Status: A fazer/ }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Fazendo' }))
    expect(h.setTaskStatus).toHaveBeenCalledWith('t2', 'doing')
    await waitFor(() => expect(h.reload).toHaveBeenCalled())
  })

  it('membro não vê Editar, Apagar nem Nova tarefa', () => {
    go('/tarefas?t=t1')
    for (const name of [/Editar/, /Apagar/, /Nova tarefa/]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('se setItemDone falhar, a caixa volta e a mensagem de erro aparece', async () => {
    h.setItemDone.mockRejectedValue(new Error('Você não tem permissão para fazer isso.'))
    go('/tarefas?t=t1')
    const box = screen.getByRole('checkbox', { name: 'Menu' })
    await userEvent.click(box)
    expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para fazer isso.')
    expect(box).not.toBeChecked()
    expect(h.reload).not.toHaveBeenCalled()
  })

  it('se setTaskStatus falhar, o status volta e a mensagem de erro aparece', async () => {
    h.setTaskStatus.mockRejectedValue(new Error('Não foi possível atualizar a tarefa. Tente de novo.'))
    go('/tarefas?t=t2')
    await userEvent.click(screen.getByRole('button', { name: /Status: A fazer/ }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Fazendo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar a tarefa.')
    expect(screen.getByRole('button', { name: /Status: A fazer/ })).toBeInTheDocument()
    expect(h.reload).not.toHaveBeenCalled()
  })

  it('um erro some quando a ação seguinte dá certo, e o mais novo substitui o antigo', async () => {
    h.setItemDone.mockRejectedValueOnce(new Error('Erro do item'))
    h.setTaskStatus.mockRejectedValueOnce(new Error('Erro do status'))
    go('/tarefas?t=t1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Menu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Erro do item')
    // Nova falha troca a mensagem (não fica a antiga mascarando).
    await userEvent.click(screen.getByRole('button', { name: /Status: Fazendo/ }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Feito' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Erro do status'))
    expect(screen.getByRole('alert')).not.toHaveTextContent('Erro do item')
    // Ação que dá certo limpa o erro.
    await userEvent.click(screen.getByRole('button', { name: /Status: Fazendo/ }))
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Feito' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('o erro de uma tarefa não aparece ao abrir outra', async () => {
    h.setItemDone.mockRejectedValue(new Error('Erro do item'))
    go('/tarefas?t=t1')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Menu' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    await userEvent.click(screen.getByRole('button', { name: /Escrever testes/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Escrever testes')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sem tarefas mostra "Nenhuma tarefa por aqui."', () => {
    h.data = { ...base, tasks: [], items: [], reload: h.reload } as DataState
    go('/tarefas')
    expect(screen.getByText('Nenhuma tarefa por aqui.')).toBeInTheDocument()
  })
})

describe('Tarefas: agrupamento', () => {
  it('recolher um projeto esconde as tarefas dele e mantém as dos outros', async () => {
    go('/tarefas')
    await userEvent.click(screen.getByRole('button', { name: 'Recolher Portal' }))
    expect(screen.queryByRole('button', { name: /Montar header/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Expandir Portal' }))
    expect(screen.getByRole('button', { name: /Montar header/ })).toBeInTheDocument()
  })

  it('no quadro o projeto aparece uma vez por coluna, não em cada card', async () => {
    go('/tarefas?v=quadro')
    const feito = screen.getByRole('region', { name: 'Feito' })
    expect(within(feito).getByRole('heading', { name: /Gadget/ })).toBeInTheDocument()
  })
})

describe('Quadro: projetos longos', () => {
  it('mostra 2 tarefas por projeto na coluna e o resto em "Mostrar mais"', async () => {
    h.data = {
      ...base,
      reload: h.reload,
      tasks: ['a', 'b', 'c', 'd', 'e'].map((n, i) => task(`x${n}`, `Tarefa ${n}`, { position: i })),
      items: [],
    } as DataState
    go('/tarefas?v=quadro')
    const col = screen.getByRole('region', { name: 'A fazer' })
    expect(within(col).getByText('Tarefa b')).toBeInTheDocument()
    expect(within(col).queryByText('Tarefa c')).not.toBeInTheDocument()
    await userEvent.click(within(col).getByRole('button', { name: 'Mostrar mais 3' }))
    expect(within(col).getByText('Tarefa e')).toBeInTheDocument()
    await userEvent.click(within(col).getByRole('button', { name: 'Mostrar menos' }))
    expect(within(col).queryByText('Tarefa c')).not.toBeInTheDocument()
  })
})
