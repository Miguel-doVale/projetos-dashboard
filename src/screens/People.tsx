import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/fx/EmptyState'
import { ConfirmDelete } from '@/edit/ConfirmDelete'
import { PersonForm } from '@/edit/PersonForm'
import { SectionHeading } from '@/blocks/Sections'
import { useData } from '@/data/DataProvider'
import { projectsOf } from '@/lib/derive'
import type { Person } from '@/lib/types'

const NO_AREA = 'Sem diretoria'

export default function People() {
  const { people, members, projects } = useData()
  const owner = useAuth().access === 'owner'
  // `null` fecha; `'new'` cria; uma pessoa edita.
  const [form, setForm] = useState<Person | 'new' | null>(null)
  const groups = new Map<string, Person[]>()
  for (const p of people) {
    const key = p.area?.trim() || NO_AREA
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  // "Sem diretoria" sempre por último.
  const ordered = [...groups.entries()].sort(([a], [b]) => Number(a === NO_AREA) - Number(b === NO_AREA))

  return (
    <div className="space-y-16">
      {owner && (
        <div className="flex justify-end">
          <Button onClick={() => setForm('new')}>Nova pessoa</Button>
        </div>
      )}
      {people.length === 0 && <EmptyState>Nenhuma pessoa cadastrada.</EmptyState>}
      {ordered.map(([area, list], i) => (
        <section key={area}>
          <SectionHeading index={String(i + 1).padStart(2, '0')}>{area}</SectionHeading>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => {
              const mine = projectsOf(p.id, members, projects)
              return (
                <li key={p.id} data-reveal className="rounded-xl border border-border bg-surface-raised px-4 py-4">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  {p.role && <p className="mt-0.5 font-mono text-xs text-muted">{p.role}</p>}
                  {mine.length > 0 && (
                    <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {mine.map((pr) => (
                        <Link key={pr.id} to={`/projetos/${pr.id}`} className="text-label hover:text-accent">
                          {pr.title}
                        </Link>
                      ))}
                    </p>
                  )}
                  {owner && (
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" aria-label={`Editar ${p.name}`} onClick={() => setForm(p)}>
                        Editar
                      </Button>
                      <ConfirmDelete
                        table="people"
                        id={p.id}
                        name={p.name}
                        consequence="A pessoa sai das equipes dos projetos, perde o acesso ao dashboard e suas tarefas ficam sem responsável."
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {form && <PersonForm person={form === 'new' ? undefined : form} onClose={() => setForm(null)} />}
    </div>
  )
}
