import { Link } from 'react-router'
import { SectionHeading } from '@/blocks/Sections'
import { useData } from '@/data/DataProvider'
import { projectsOf } from '@/lib/derive'
import type { Person } from '@/lib/types'

const NO_AREA = 'Sem diretoria'

export default function People() {
  const { people, members, projects } = useData()
  const groups = new Map<string, Person[]>()
  for (const p of people) {
    const key = p.area?.trim() || NO_AREA
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  // "Sem diretoria" sempre por último.
  const ordered = [...groups.entries()].sort(([a], [b]) => Number(a === NO_AREA) - Number(b === NO_AREA))

  return (
    <div className="space-y-16">
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
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
