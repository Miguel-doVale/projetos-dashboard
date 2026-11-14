import { Link } from 'react-router'
import { StatusBadge } from '@/blocks/StatusBadge'
import { SectionHeading } from '@/blocks/Sections'
import { ImportSeedButton } from '@/data/ImportSeedButton'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { overviewStats, progressOf } from '@/lib/derive'

export default function Overview() {
  const { access } = useAuth()
  const { projects, tasks, people, memberUids } = useData()
  const stats = overviewStats(projects, tasks, people, memberUids, access === 'owner')
  return (
    <>
      <header className="mb-14 max-w-3xl">
        <p className="font-mono text-xs tracking-widest text-label uppercase">LASETE {'//'} Diretoria de Projetos</p>
        <h1 className="mt-4 text-4xl leading-[1.05] font-[650] tracking-tight text-foreground sm:text-5xl">
          Onde cada projeto está.
        </h1>
      </header>

      <ImportSeedButton />

      <dl className="mb-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-raised px-4 py-4">
            <dd className="text-2xl font-[650] text-foreground tabular-nums">{s.value}</dd>
            <dt className="mt-1 font-mono text-[11px] tracking-wider text-muted uppercase">{s.label}</dt>
          </div>
        ))}
      </dl>

      <SectionHeading index="01">Projetos</SectionHeading>
      <ol className="divide-y divide-border border-y border-border">
        {projects.map((p) => {
          const { done, total } = progressOf(p.id, tasks)
          return (
            <li key={p.id} data-reveal>
              <Link
                to={`/projetos/${p.id}`}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-2 px-2 py-5 transition-colors hover:bg-hover sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
              >
                <span className="font-mono text-xs text-label">{p.number}</span>
                <span className="min-w-0 truncate text-lg font-medium text-foreground">{p.title}</span>
                <span className="col-start-2 sm:col-start-auto">
                  <StatusBadge level={p.status_level} label={p.status_label} />
                </span>
                <span className="col-start-2 font-mono text-xs text-muted sm:col-start-auto sm:w-12 sm:text-right">
                  {done}/{total}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </>
  )
}
