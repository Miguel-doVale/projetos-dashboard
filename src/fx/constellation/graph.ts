import type { Project, ProjectMember, StatusLevel } from '@/lib/types'

export interface GraphNode {
  id: string
  number: string
  title: string
  level: StatusLevel
  size: number
}
export interface GraphLink {
  a: string
  b: string
  weight: number
}
export interface Graph {
  nodes: GraphNode[]
  links: GraphLink[]
}

/** Nós na ordem de `position`; um link por par de projetos com gente em comum (`weight` = quantas pessoas). */
export function buildGraph(projects: Project[], members: ProjectMember[]): Graph {
  const ordered = [...projects].sort((x, y) => x.position - y.position)
  const rank = new Map(ordered.map((p, i) => [p.id, i]))
  const peopleOf = new Map<string, Set<string>>(ordered.map((p) => [p.id, new Set()]))
  for (const m of members) peopleOf.get(m.project_id)?.add(m.person_id)

  const nodes = ordered.map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    level: p.status_level,
    size: Math.max(1, peopleOf.get(p.id)?.size ?? 0),
  }))

  const projectsOfPerson = new Map<string, string[]>()
  for (const [projectId, people] of peopleOf) {
    for (const person of people) projectsOfPerson.set(person, [...(projectsOfPerson.get(person) ?? []), projectId])
  }
  const weights = new Map<string, GraphLink>()
  for (const ids of projectsOfPerson.values()) {
    const sorted = [...ids].sort((x, y) => rank.get(x)! - rank.get(y)!)
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}\u0000${sorted[j]}`
        const link = weights.get(key)
        if (link) link.weight += 1
        else weights.set(key, { a: sorted[i], b: sorted[j], weight: 1 })
      }
    }
  }
  return { nodes, links: [...weights.values()] }
}

/** Cor por status, igual na cena 3D e no fallback. */
export const LEVEL_COLOR: Record<StatusLevel, string> = {
  on: '#9cddbd',
  half: '#5f8571',
  off: '#6b7570',
}

/** Distribuição de Fibonacci na esfera de raio 1 (posições estáveis para o mesmo índice). */
export function fibonacciPoint(i: number, n: number): [number, number, number] {
  if (n <= 1) return [0, 0, 1]
  const y = 1 - (2 * i) / (n - 1)
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = Math.PI * (3 - Math.sqrt(5)) * i
  return [Math.cos(theta) * r, y, Math.sin(theta) * r]
}
