import type { Fact, Person, Project, ProjectMember, Task } from '@/lib/types'

export const TASK_STATUS_LABEL: Record<Task['status'], string> = {
  todo: 'A fazer',
  doing: 'Fazendo',
  done: 'Feito',
}

export interface TeamEntry {
  person: Person
  role: string | null
  is_lead: boolean
}

/** Equipe do projeto, com a frente primeiro. Ignora membro cuja pessoa não existe. */
export function teamOf(projectId: string, members: ProjectMember[], people: Person[]): TeamEntry[] {
  const byId = new Map(people.map((p) => [p.id, p]))
  const team: TeamEntry[] = []
  for (const m of members) {
    if (m.project_id !== projectId) continue
    const person = byId.get(m.person_id)
    if (person) team.push({ person, role: m.role, is_lead: m.is_lead })
  }
  return [...team.filter((t) => t.is_lead), ...team.filter((t) => !t.is_lead)]
}

export function projectsOf(personId: string, members: ProjectMember[], projects: Project[]): Project[] {
  const ids = new Set(members.filter((m) => m.person_id === personId).map((m) => m.project_id))
  return projects.filter((p) => ids.has(p.id))
}

export function progressOf(projectId: string, tasks: Task[]): { done: number; total: number } {
  const own = tasks.filter((t) => t.project_id === projectId)
  return { done: own.filter((t) => t.status === 'done').length, total: own.length }
}

export function overviewStats(projects: Project[], tasks: Task[], people: Person[]): Fact[] {
  const count = (kind: Project['kind']) => String(projects.filter((p) => p.kind === kind).length)
  return [
    { label: 'Projetos', value: count('projeto') },
    { label: 'Colaborações', value: count('colaboracao') },
    { label: 'Gadgets', value: count('gadget') },
    { label: 'Tarefas feitas', value: `${tasks.filter((t) => t.status === 'done').length}/${tasks.length}` },
    {
      label: 'Com prazo definido',
      value: String(projects.filter((p) => typeof p.deadline === 'string' && p.deadline !== '').length),
    },
    { label: 'Pessoas com acesso', value: String(people.filter((p) => p.access !== 'none').length) },
  ]
}
