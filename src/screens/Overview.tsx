import { lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router'
import { StatusBadge } from '@/blocks/StatusBadge'
import { SectionHeading } from '@/blocks/Sections'
import { ImportSeedButton } from '@/data/ImportSeedButton'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { CountUp } from '@/fx/CountUp'
import { SplitTitle } from '@/fx/SplitTitle'
import { usePointerGlow } from '@/fx/usePointerGlow'
import { ConstellationFallback } from '@/fx/constellation/ConstellationFallback'
import { buildGraph } from '@/fx/constellation/graph'
import { overviewStats, progressOf } from '@/lib/derive'

// three vai num pedaço separado, baixado só aqui.
const Constellation = lazy(() => import('@/fx/constellation/Constellation'))

export default function Overview() {
  const { access } = useAuth()
  const { projects, tasks, people, members, memberUids } = useData()
  const navigate = useNavigate()
  const glow = usePointerGlow({ tilt: false }) // as células ficam num contêiner com overflow-hidden
  const open = (id: string) => navigate(`/projetos/${id}`)
  const stats = overviewStats(projects, tasks, people, memberUids, access === 'owner')
  return (
    <>
      <div className="mb-14 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10">
        <header className="mb-10 max-w-3xl lg:mb-0">
          <p className="font-mono text-xs tracking-widest text-label uppercase">LASETE {'//'} Diretoria de Projetos</p>
          <SplitTitle className="mt-4 text-4xl leading-[1.05] font-[650] tracking-tight text-foreground sm:text-5xl">
            Onde cada projeto está.
          </SplitTitle>
        </header>
        {projects.length > 0 && (
          <Suspense fallback={<ConstellationFallback graph={buildGraph(projects, members)} onOpen={open} />}>
            <Constellation projects={projects} members={members} onOpen={open} />
          </Suspense>
        )}
      </div>

      <ImportSeedButton />

      <dl className="mb-16 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} {...glow} className="fx-card bg-surface-raised px-4 py-4">
            <dd className="text-2xl font-[650] text-foreground tabular-nums">
              <CountUp value={s.value} />
            </dd>
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
