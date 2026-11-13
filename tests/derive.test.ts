import { describe, expect, it } from 'vitest'
import { overviewStats, progressOf, projectsOf, teamOf } from '@/lib/derive'
import type { Person, Project, ProjectMember, Task } from '@/lib/types'

const person = (id: string, name: string, access: Person['access'] = 'member'): Person => ({
  id, created_at: null, name, role: null, area: null, email: null, access,
})
const member = (id: string, project_id: string, person_id: string, is_lead = false): ProjectMember => ({
  id, created_at: null, project_id, person_id, role: 'Dev', is_lead,
})
const project = (id: string, kind: Project['kind'], deadline: string | null): Project => ({
  id, created_at: null, position: 1, number: '01', title: id, kind, status_level: 'on',
  status_label: 'Ok', summary: null, deadline, facts: [], sections: [],
})
const task = (id: string, project_id: string, status: Task['status']): Task => ({
  id, created_at: null, project_id, title: id, description: null, status,
  assignee_id: null, sprint_id: null, due_on: null, position: 1,
})

describe('derive', () => {
  const people = [person('a', 'Ana'), person('b', 'Bia')]

  it('teamOf põe a frente primeiro e ignora pessoa inexistente', () => {
    const members = [member('1', 'p', 'a'), member('2', 'p', 'zz'), member('3', 'p', 'b', true), member('4', 'q', 'a')]
    const team = teamOf('p', members, people)
    expect(team.map((t) => t.person.name)).toEqual(['Bia', 'Ana'])
    expect(team[0]).toMatchObject({ is_lead: true, role: 'Dev' })
  })

  it('progressOf sem tarefas é 0/0', () => {
    expect(progressOf('p', [])).toEqual({ done: 0, total: 0 })
    expect(progressOf('p', [task('1', 'p', 'done'), task('2', 'p', 'todo'), task('3', 'q', 'done')])).toEqual({ done: 1, total: 2 })
  })

  it('projectsOf sem projetos é []', () => {
    expect(projectsOf('a', [], [project('p', 'projeto', null)])).toEqual([])
    expect(projectsOf('a', [member('1', 'p', 'a')], [project('p', 'projeto', null), project('q', 'projeto', null)]).map((p) => p.id)).toEqual(['p'])
  })

  it('overviewStats conta por kind, tarefas, prazos e acessos', () => {
    const stats = overviewStats(
      [project('p', 'projeto', '12/12'), project('q', 'gadget', null), project('r', 'projeto', '')],
      [task('1', 'p', 'done'), task('2', 'p', 'todo')],
      [person('a', 'Ana', 'owner'), person('b', 'Bia', 'none')],
    )
    const get = (l: string) => stats.find((s) => s.label === l)?.value
    expect(get('Projetos')).toBe('2')
    expect(get('Gadgets')).toBe('1')
    expect(get('Colaborações')).toBe('0')
    expect(get('Tarefas feitas')).toBe('1/2')
    expect(get('Com prazo definido')).toBe('1')
    expect(get('Pessoas com acesso')).toBe('1')
  })
})
