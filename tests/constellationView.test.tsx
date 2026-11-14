import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Overview from '@/screens/Overview'
import type { Project } from '@/lib/types'

const h = vi.hoisted(() => ({ data: null as unknown }))
vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ access: 'owner' }) }))
vi.mock('@/data/DataProvider', () => ({ useData: () => h.data }))
vi.mock('@/data/ImportSeedButton', () => ({ ImportSeedButton: () => null }))

const project = (id: string, position: number): Project => ({
  id, created_at: null, position, number: `0${position}`, title: `Projeto ${id}`, kind: 'projeto',
  status_level: 'on', status_label: 'Em andamento', summary: null, deadline: null, facts: [], sections: [],
})
h.data = { projects: [project('p1', 1), project('p2', 2)], members: [], tasks: [], people: [], memberUids: [] }

afterEach(cleanup)

describe('constelação: lista de links e legenda', () => {
  it('a lista de links existe, é sr-only e aparece com foco', () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>,
    )
    const nav = screen.getByRole('navigation', { name: 'Projetos da constelação' })
    expect(nav).toHaveClass('sr-only')
    expect(nav.className).toContain('focus-within:not-sr-only')
    expect(nav.querySelectorAll('a')).toHaveLength(2)
  })

  it('mostra a legenda abaixo da constelação', () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>,
    )
    const legend = document.querySelector('[data-legend]')!
    expect(legend.textContent).toBe('● em andamento ● fase inicial ● a definir · linhas = pessoas em comum')
  })
})
