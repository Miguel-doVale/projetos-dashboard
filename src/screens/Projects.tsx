import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { ProjectForm } from '@/edit/ProjectForm'
import { ExportMenu } from '@/export/ExportMenu'
import { StatusBadge } from '@/blocks/StatusBadge'
import { SectionHeading } from '@/blocks/Sections'
import { useData } from '@/data/DataProvider'
import { progressOf, teamOf } from '@/lib/derive'
import type { Project } from '@/lib/types'

function ProjectCard({ project }: { project: Project }) {
  const { members, people, tasks } = useData()
  const { done, total } = progressOf(project.id, tasks)
  const lead = teamOf(project.id, members, people).find((t) => t.is_lead)
  return (
    <Link
      to={`/projetos/${project.id}`}
      data-reveal
      className="group flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5 transition-colors hover:border-accent/40 hover:bg-hover"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-foreground px-2 py-0.5 font-mono text-xs font-medium text-black">{project.number}</span>
        <StatusBadge level={project.status_level} label={project.status_label} />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg leading-snug font-[650] text-foreground">{project.title}</h3>
        {project.summary && <p className="line-clamp-3 text-sm leading-relaxed text-muted">{project.summary}</p>}
      </div>
      <div className="mt-auto space-y-3">
        {lead && (
          <p className="font-mono text-xs text-muted">
            Frente <span className="text-foreground">{lead.person.name}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Progresso"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-border"
          >
            <div className="h-full bg-accent" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
          </div>
          <span className="font-mono text-xs text-muted">
            {done}/{total}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function Projects() {
  const { projects } = useData()
  const owner = useAuth().access === 'owner'
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <SectionHeading index="01">Projetos</SectionHeading>
        <div className="flex gap-2">
          <ExportMenu />
          {owner && <Button onClick={() => setCreating(true)}>Novo projeto</Button>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      {creating && <ProjectForm onClose={() => setCreating(false)} onSaved={(id) => navigate(`/projetos/${id}`)} />}
    </>
  )
}
