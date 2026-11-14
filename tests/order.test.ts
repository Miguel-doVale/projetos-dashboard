import { describe, expect, it, vi } from 'vitest'
import { sortPeople, sortSprints } from '@/data/DataProvider'
import type { Person, Sprint } from '@/lib/types'

vi.mock('firebase/firestore', async () => await import('./helpers/fakeFirestore'))

const sprint = (name: string, starts_on: string | null): Sprint => ({
  id: name, created_at: null, name, starts_on, ends_on: null,
})
const person = (name: string): Person => ({
  id: name, created_at: null, name, role: null, area: null, email: null, uid: null,
})

describe('ordem das listas', () => {
  it('sprints por início, sem data por último, depois pelo nome', () => {
    const out = sortSprints([
      sprint('Zeta', null),
      sprint('B', '2026-03-01'),
      sprint('Alfa', null),
      sprint('A', '2026-01-10'),
      sprint('A2', '2026-03-01'),
    ])
    expect(out.map((s) => s.name)).toEqual(['A', 'A2', 'B', 'Alfa', 'Zeta'])
  })

  it('pessoas pelo nome em pt-BR (acentos não jogam para o fim)', () => {
    const out = sortPeople([person('Zélia'), person('Ágata'), person('Beto'), person('Ana')])
    expect(out.map((p) => p.name)).toEqual(['Ágata', 'Ana', 'Beto', 'Zélia'])
  })
})
