import { describe, expect, it } from 'vitest'
import { buildGraph } from '@/fx/constellation/graph'
import type { Project, ProjectMember } from '@/lib/types'

const project = (id: string, position: number): Project => ({
  id, created_at: null, position, number: String(position).padStart(2, '0'), title: `P ${id}`, kind: 'projeto',
  status_level: 'on', status_label: 'Em andamento', summary: null, deadline: null, facts: [], sections: [],
})
const member = (project_id: string, person_id: string): ProjectMember => ({
  id: `${project_id}-${person_id}`, created_at: null, project_id, person_id, role: null, is_lead: false,
})

describe('buildGraph', () => {
  it('projetos sem membros: sem links e size 1', () => {
    const g = buildGraph([project('a', 1), project('b', 2)], [])
    expect(g.links).toEqual([])
    expect(g.nodes.map((n) => n.size)).toEqual([1, 1])
  })

  it('uma pessoa em comum gera um link de peso 1', () => {
    const g = buildGraph([project('a', 1), project('b', 2)], [member('a', 'x'), member('b', 'x')])
    expect(g.links).toEqual([{ a: 'a', b: 'b', weight: 1 }])
  })

  it('duas pessoas em comum dão peso 2, sem duplicar o link', () => {
    const g = buildGraph(
      [project('a', 1), project('b', 2)],
      [member('a', 'x'), member('b', 'x'), member('a', 'y'), member('b', 'y')],
    )
    expect(g.links).toEqual([{ a: 'a', b: 'b', weight: 2 }])
    expect(g.nodes.map((n) => n.size)).toEqual([2, 2])
  })

  it('ignora membro de projeto inexistente', () => {
    const g = buildGraph([project('a', 1), project('b', 2)], [member('a', 'x'), member('zz', 'x')])
    expect(g.links).toEqual([])
    expect(g.nodes.map((n) => n.size)).toEqual([1, 1])
  })

  it('nós seguem position e a mesma pessoa duplicada no projeto conta uma vez', () => {
    const g = buildGraph([project('b', 2), project('a', 1)], [member('a', 'x'), member('a', 'x')])
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(g.nodes[0].size).toBe(1)
  })
})
