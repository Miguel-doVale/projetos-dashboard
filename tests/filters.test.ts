import { describe, expect, it } from 'vitest'
import type { Task } from '@/lib/types'
import { filterFromSearch, filterTasks, searchFromFilter, sortTasks } from '@/tasks/filters'

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, created_at: null, project_id: 'p1', title: id, description: null, status: 'todo',
  assignee_id: null, sprint_id: null, due_on: null, position: 0, ...over,
})
const tasks = [
  task('a', { project_id: 'p1', sprint_id: 's1', assignee_id: 'x', status: 'doing' }),
  task('b', { project_id: 'p2', sprint_id: null, assignee_id: 'x' }),
  task('c', { project_id: 'p1', sprint_id: null, assignee_id: null, status: 'doing' }),
]
const ids = (ts: Task[]) => ts.map((t) => t.id)

describe('filterTasks', () => {
  it('filtro vazio devolve tudo', () => expect(ids(filterTasks(tasks, {}))).toEqual(['a', 'b', 'c']))
  it("sprint 'none' devolve só tarefas sem sprint", () =>
    expect(ids(filterTasks(tasks, { sprint: 'none' }))).toEqual(['b', 'c']))
  it("assignee 'none' devolve só tarefas sem responsável", () =>
    expect(ids(filterTasks(tasks, { assignee: 'none' }))).toEqual(['c']))
  it('filtros combinam com E', () => {
    expect(ids(filterTasks(tasks, { project: 'p1', status: 'doing' }))).toEqual(['a', 'c'])
    expect(ids(filterTasks(tasks, { project: 'p1', status: 'doing', sprint: 's1' }))).toEqual(['a'])
    expect(ids(filterTasks(tasks, { project: 'p2', status: 'doing' }))).toEqual([])
  })
})

describe('filtros na URL', () => {
  it('ida e volta preserva o filtro', () => {
    const f = { project: 'p1', sprint: 'none', assignee: 'x', status: 'done' as const }
    expect(filterFromSearch(searchFromFilter(f))).toEqual(f)
  })
  it('status desconhecido na URL é ignorado', () => {
    expect(filterFromSearch(new URLSearchParams('status=xyz&projeto=p1'))).toEqual({ project: 'p1' })
  })
  it('usa os nomes de parâmetro em português', () => {
    expect(searchFromFilter({ project: 'p', assignee: 'x' }).toString()).toBe('projeto=p&pessoa=x')
  })
})

describe('sortTasks', () => {
  it('ordena por position e depois por created_at', () => {
    const sorted = sortTasks([
      task('c', { position: 2 }),
      task('b', { position: 1, created_at: '2026-02-01' }),
      task('a', { position: 1, created_at: '2026-01-01' }),
    ])
    expect(ids(sorted)).toEqual(['a', 'b', 'c'])
  })
})
