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

/** Pessoa com login que é a dona, está em `admins` ou em `members`. */
export function hasAccess(person: Person, memberUids: string[], adminUids: string[] = []): boolean {
  if (!person.uid) return false
  return (
    person.uid === import.meta.env.VITE_OWNER_UID ||
    memberUids.includes(person.uid) ||
    adminUids.includes(person.uid)
  )
}

export function overviewStats(
  projects: Project[],
  tasks: Task[],
  people: Person[],
  memberUids: string[],
  adminUids: string[],
  /** Só o dono consegue listar `members`; para os demais a contagem de acesso seria sempre 0. */
  includeAccess = true,
): Fact[] {
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
    ...(includeAccess
      ? [{ label: 'Pessoas com acesso', value: String(people.filter((p) => hasAccess(p, memberUids, adminUids)).length) }]
      : []),
  ]
}

/** Facts do projeto mais o prazo. Um prazo preenchido substitui o fact "Prazo" (sem repetir). */
export function factsOf(p: Pick<Project, 'facts' | 'deadline'>): Fact[] {
  const deadline = p.deadline?.trim()
  if (!deadline) return p.facts
  const isDeadline = (f: Fact) => f.label.trim().toLowerCase() === 'prazo'
  const at = p.facts.findIndex(isDeadline)
  const rest = p.facts.filter((f) => !isDeadline(f))
  const fact = { label: at >= 0 ? p.facts[at].label : 'Prazo', value: p.deadline as string }
  return at >= 0 ? [...rest.slice(0, at), fact, ...rest.slice(at)] : [...rest, fact]
}
