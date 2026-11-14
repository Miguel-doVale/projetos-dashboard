import { describe, expect, it } from 'vitest'
import { factsOf, overviewStats, progressOf, projectsOf, teamOf } from '@/lib/derive'
import type { Person, Project, ProjectMember, Task } from '@/lib/types'

const person = (id: string, name: string, uid: string | null = null): Person => ({
  id, created_at: null, name, role: null, area: null, email: null, uid,
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
      [person('a', 'Ana', 'ua'), person('b', 'Bia', 'ub'), person('c', 'Caio')],
      ['ua'],
      ['ub'],
    )
    const get = (l: string) => stats.find((s) => s.label === l)?.value
    expect(get('Projetos')).toBe('2')
    expect(get('Gadgets')).toBe('1')
    expect(get('Colaborações')).toBe('0')
    expect(get('Tarefas feitas')).toBe('1/2')
    expect(get('Com prazo definido')).toBe('1')
    expect(get('Pessoas com acesso')).toBe('2')
  })
})

describe('factsOf', () => {
  const base = project('p', 'projeto', null)
  it('sem prazo preenchido, devolve os facts como estão', () => {
    const facts = [{ label: 'Prazo', value: 'a definir' }, { label: 'Local', value: 'Sala 1' }]
    expect(factsOf({ ...base, facts, deadline: null })).toEqual(facts)
    expect(factsOf({ ...base, facts, deadline: '  ' })).toEqual(facts)
  })
  it('prazo preenchido substitui o fact "Prazo" (sem repetir, sem diferenciar caixa)', () => {
    const facts = [{ label: ' prazo ', value: 'antigo' }, { label: 'Local', value: 'Sala 1' }]
    const out = factsOf({ ...base, facts, deadline: 'dez/2026' })
    expect(out).toHaveLength(2)
    expect(out[0].value).toBe('dez/2026')
    expect(out.filter((f) => f.label.trim().toLowerCase() === 'prazo')).toHaveLength(1)
  })
  it('sem fact "Prazo", acrescenta o prazo no fim', () => {
    expect(factsOf({ ...base, facts: [{ label: 'Local', value: 'Sala 1' }], deadline: 'dez/2026' })).toEqual([
      { label: 'Local', value: 'Sala 1' },
      { label: 'Prazo', value: 'dez/2026' },
    ])
  })
})

describe('overviewStats sem acesso do dono', () => {
  it('omite "Pessoas com acesso" quando includeAccess é falso', () => {
    const labels = overviewStats([], [], [], [], [], false).map((s) => s.label)
    expect(labels).not.toContain('Pessoas com acesso')
    expect(overviewStats([], [], [], [], []).map((s) => s.label)).toContain('Pessoas com acesso')
  })
})
