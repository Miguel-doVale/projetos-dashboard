import type { Task, TaskItem } from '@/lib/types'

export type TaskFilter = {
  project?: string
  sprint?: string | 'none'
  assignee?: string | 'none'
  status?: Task['status']
}

const STATUSES: Task['status'][] = ['todo', 'doing', 'done']

// Parâmetros da URL de cada filtro.
const KEYS = { project: 'projeto', sprint: 'sprint', assignee: 'pessoa', status: 'status' } as const

export function filterTasks(tasks: Task[], f: TaskFilter): Task[] {
  return tasks.filter((t) => {
    if (f.project && t.project_id !== f.project) return false
    if (f.sprint && (f.sprint === 'none' ? t.sprint_id !== null : t.sprint_id !== f.sprint)) return false
    if (f.assignee && (f.assignee === 'none' ? t.assignee_id !== null : t.assignee_id !== f.assignee)) return false
    if (f.status && t.status !== f.status) return false
    return true
  })
}

export function filterFromSearch(params: URLSearchParams): TaskFilter {
  const f: TaskFilter = {}
  const project = params.get(KEYS.project)
  const sprint = params.get(KEYS.sprint)
  const assignee = params.get(KEYS.assignee)
  const status = params.get(KEYS.status)
  if (project) f.project = project
  if (sprint) f.sprint = sprint
  if (assignee) f.assignee = assignee
  if (status && (STATUSES as string[]).includes(status)) f.status = status as Task['status']
  return f
}

export function searchFromFilter(f: TaskFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (f.project) params.set(KEYS.project, f.project)
  if (f.sprint) params.set(KEYS.sprint, f.sprint)
  if (f.assignee) params.set(KEYS.assignee, f.assignee)
  if (f.status && STATUSES.includes(f.status)) params.set(KEYS.status, f.status)
  return params
}

/** Ordena tarefas (ou itens) por `position` e, em empate, por `created_at`. Não altera o array recebido. */
export function sortTasks<T extends { position: number; created_at: string | null }>(tasks: T[]): T[] {
  return [...tasks].sort(
    (a, b) => a.position - b.position || (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  )
}

/** Itens feitos / total, somando escopo e testes. `null` quando a tarefa não tem itens. */
export function itemProgress(taskId: string, items: TaskItem[]): { done: number; total: number } | null {
  const own = items.filter((i) => i.task_id === taskId)
  if (own.length === 0) return null
  return { done: own.filter((i) => i.done).length, total: own.length }
}

/** '2026-11-13' -> '13/11/2026' (sem passar por Date, para não deslocar o dia). */
export function formatDue(iso: string | null): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null
}
