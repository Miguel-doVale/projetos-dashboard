import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { EmptyState } from '@/fx/EmptyState'
import { motionEnabled } from '@/lib/motion'
import { useData } from '@/data/DataProvider'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Project, Task } from '@/lib/types'
import { formatDue, itemProgress, sortTasks } from '@/tasks/filters'
import { TaskStatusIcon } from '@/tasks/TaskStatusIcon'

export function EmptyTasks() {
  return <EmptyState>Nenhuma tarefa por aqui.</EmptyState>
}

export function ProgressCount({ taskId }: { taskId: string }) {
  const { items } = useData()
  const p = itemProgress(taskId, items)
  if (!p) return null
  return (
    <span className="font-mono text-xs text-muted" aria-label={`${p.done} de ${p.total} itens feitos`}>
      {p.done}/{p.total}
    </span>
  )
}

/** Fazendo primeiro, depois a fazer, e as feitas por último: o que pede atenção fica no topo. */
const STATUS_ORDER: Record<Task['status'], number> = { doing: 0, todo: 1, done: 2 }

export function orderForReading(tasks: Task[]): Task[] {
  return sortTasks(tasks).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

/** Agrupa por projeto, na ordem dos projetos; tarefas de projeto inexistente vão para um grupo "Sem projeto" no fim. */
export function groupByProject(tasks: Task[], projects: Project[]): { project: Project | null; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>()
  for (const t of tasks) groups.set(t.project_id, [...(groups.get(t.project_id) ?? []), t])
  const out: { project: Project | null; tasks: Task[] }[] = []
  for (const p of projects) {
    const own = groups.get(p.id)
    if (own) out.push({ project: p, tasks: orderForReading(own) })
    groups.delete(p.id)
  }
  const orphans = [...groups.values()].flat()
  if (orphans.length) out.push({ project: null, tasks: orderForReading(orphans) })
  return out
}

interface Props {
  tasks: Task[]
  onOpen: (taskId: string) => void
  /** Com várias tarefas de projetos diferentes, agrupa por projeto. Dentro de um projeto, lista direta. */
  showProject?: boolean
}

export function TaskList({ tasks, onOpen, showProject = true }: Props) {
  const { projects } = useData()
  if (!showProject) {
    return (
      <div data-reveal className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <Rows tasks={orderForReading(tasks)} onOpen={onOpen} />
      </div>
    )
  }
  return (
    <div data-reveal className="space-y-4">
      {groupByProject(tasks, projects).map((g) => (
        <ProjectGroup key={g.project?.id ?? 'sem-projeto'} project={g.project} tasks={g.tasks} onOpen={onOpen} />
      ))}
    </div>
  )
}

function ProjectGroup({ project, tasks, onOpen }: { project: Project | null; tasks: Task[]; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(true)
  const title = project?.title ?? 'Sem projeto'
  const done = tasks.filter((t) => t.status === 'done').length
  const pct = tasks.length ? done / tasks.length : 0
  const bodyId = `grupo-${project?.id ?? 'sem-projeto'}`
  return (
    <section aria-label={title} className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        {project && (
          <span className="shrink-0 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-xs text-background">
            {project.number}
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {project ? (
            <Link to={`/projetos/${project.id}`} className="hover:text-accent focus-visible:text-accent focus-visible:outline-none">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <span className="hidden w-24 sm:block" aria-hidden="true">
          <span className="block h-1 overflow-hidden rounded-full bg-border">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${pct * 100}%` }} />
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted" aria-label={`${done} de ${tasks.length} tarefas feitas`}>
          {done}/{tasks.length}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? `Recolher ${title}` : `Expandir ${title}`}
          onClick={() => setOpen((v) => !v)}
          className="-mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      </header>
      {open && (
        <div id={bodyId}>
          <Rows tasks={tasks} onOpen={onOpen} />
        </div>
      )}
    </section>
  )
}

function Rows({ tasks, onOpen }: { tasks: Task[]; onOpen: (id: string) => void }) {
  const { people, sprints } = useData()
  const personName = new Map(people.map((p) => [p.id, p.name]))
  const sprintName = new Map(sprints.map((s) => [s.id, s.name]))
  const animate = motionEnabled()
  return (
    <ul className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {tasks.map((t) => {
          const due = formatDue(t.due_on)
          const assignee = t.assignee_id ? personName.get(t.assignee_id) : undefined
          const isDone = t.status === 'done'
          return (
            <motion.li
              key={t.id}
              layout={animate ? 'position' : false}
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              exit={animate ? { opacity: 0, pointerEvents: 'none', transition: { duration: 0.12 } } : undefined}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                className="grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1.5 px-4 py-3 text-left text-sm transition-colors outline-none hover:bg-hover focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <TaskStatusIcon status={t.status} />
                <span className={`min-w-0 leading-snug ${isDone ? 'text-muted line-through decoration-muted/50' : 'text-foreground'}`}>
                  {t.title}
                  <span className="sr-only"> — {TASK_STATUS_LABEL[t.status]}</span>
                </span>
                <span className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:col-start-3 sm:justify-end">
                  {assignee ? (
                    <span className="rounded-full border border-border px-2 py-0.5 text-foreground/80">{assignee}</span>
                  ) : (
                    <span className="text-muted/70">Sem responsável</span>
                  )}
                  {t.sprint_id && <span className="font-mono text-muted">{sprintName.get(t.sprint_id)}</span>}
                  {due && <span className="font-mono text-muted">{due}</span>}
                  <ProgressCount taskId={t.id} />
                </span>
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
