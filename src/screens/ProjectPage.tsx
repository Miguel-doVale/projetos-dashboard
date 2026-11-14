import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/edit/ConfirmDelete'
import { ProjectForm } from '@/edit/ProjectForm'
import { ExportMenu } from '@/export/ExportMenu'
import { TaskForm, TaskOwnerActions } from '@/edit/TaskForm'
import { StatusBadge } from '@/blocks/StatusBadge'
import { SectionHeading, Sections } from '@/blocks/Sections'
import { useData } from '@/data/DataProvider'
import { factsOf, teamOf } from '@/lib/derive'
import { TaskList } from '@/tasks/TaskList'
import { TaskSheet, useOpenTask } from '@/tasks/TaskSheet'

export default function ProjectPage() {
  const { id } = useParams()
  const { projects, members, people, tasks } = useData()
  const [openId, openTask, closeTask] = useOpenTask()
  const owner = useAuth().access === 'owner'
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-[650] text-foreground">Projeto não encontrado</h1>
        <Link to="/projetos" className="text-sm text-accent underline-offset-4 hover:underline">
          Voltar para Projetos
        </Link>
      </div>
    )
  }

  const team = teamOf(project.id, members, people)
  const own = tasks.filter((t) => t.project_id === project.id)
  const facts = factsOf(project)
  let n = 0
  const idx = () => String(++n).padStart(2, '0')

  return (
    <div className="space-y-16">
      <header className="space-y-5">
        <Link to="/projetos" className="font-mono text-xs tracking-widest text-muted uppercase hover:text-foreground">
          ← Projetos
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <span className="rounded-md bg-foreground px-2 py-0.5 font-mono text-xs font-medium text-black">{project.number}</span>
          <StatusBadge level={project.status_level} label={project.status_label} />
        </div>
        <h1 className="max-w-4xl text-4xl leading-[1.05] font-[650] tracking-tight text-foreground sm:text-5xl">
          {project.title}
        </h1>
        {project.summary && <p className="max-w-2xl text-base leading-relaxed text-muted">{project.summary}</p>}
        <div className="flex flex-wrap gap-2">
          <ExportMenu projectId={project.id} />
          {owner && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Editar projeto
              </Button>
              <Button variant="outline" size="sm" onClick={() => setNewTask(true)}>
                Nova tarefa
              </Button>
              <ConfirmDelete
                table="projects"
                id={project.id}
                name={project.title}
                consequence="As tarefas e a equipe deste projeto também serão apagadas."
                label="Excluir projeto"
                onDeleted={() => navigate('/projetos')}
              />
            </>
          )}
        </div>
        {facts.length > 0 && (
          <dl className="flex flex-wrap gap-x-10 gap-y-3 pt-2">
            {facts.map((f, i) => (
              <div key={i}>
                <dt className="font-mono text-[11px] tracking-wider text-label uppercase">{f.label}</dt>
                <dd className="mt-0.5 text-sm text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      {team.length > 0 && (
        <section>
          <SectionHeading index={idx()}>Equipe</SectionHeading>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((t) => (
              <li key={t.person.id} data-reveal className="rounded-xl border border-border bg-surface-raised px-4 py-3">
                <p className="text-sm font-medium text-foreground">{t.person.name}</p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {[t.person.role, t.role].filter(Boolean).join(' · ') || '—'}
                  {t.is_lead && <span className="ml-2 text-accent">Frente</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {project.sections.length > 0 && (
        <section>
          <SectionHeading index={idx()}>Detalhes</SectionHeading>
          <Sections sections={project.sections} />
        </section>
      )}

      {own.length > 0 && (
        <section>
          <SectionHeading index={idx()}>Tarefas</SectionHeading>
          <TaskList tasks={own} onOpen={openTask} showProject={false} />
          <TaskSheet
            taskId={openId}
            onClose={closeTask}
            ownerActions={owner && openId ? <TaskOwnerActions taskId={openId} onClose={closeTask} /> : undefined}
          />
        </section>
      )}
      {editing && <ProjectForm project={project} onClose={() => setEditing(false)} />}
      {newTask && <TaskForm defaultProjectId={project.id} onClose={() => setNewTask(false)} />}
    </div>
  )
}
