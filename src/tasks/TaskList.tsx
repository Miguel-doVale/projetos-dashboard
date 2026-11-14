import { AnimatePresence, motion } from 'motion/react'
import { EmptyState } from '@/fx/EmptyState'
import { motionEnabled } from '@/lib/motion'
import { useData } from '@/data/DataProvider'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Task } from '@/lib/types'
import { formatDue, itemProgress, sortTasks } from '@/tasks/filters'

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

interface Props {
  tasks: Task[]
  onOpen: (taskId: string) => void
  /** Esconde a coluna de projeto quando a lista já está dentro de um projeto. */
  showProject?: boolean
}

export function TaskList({ tasks, onOpen, showProject = true }: Props) {
  const { projects, people, sprints } = useData()
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]))
  const order = new Map(projects.map((p, i) => [p.id, i]))
  const personName = new Map(people.map((p) => [p.id, p.name]))
  const sprintName = new Map(sprints.map((s) => [s.id, s.name]))
  const animate = motionEnabled()
  const rows = sortTasks(tasks).sort((a, b) => (order.get(a.project_id) ?? 0) - (order.get(b.project_id) ?? 0))

  return (
    // A entrada por rolagem fica na lista toda (data-reveal); cada linha só anima layout e saída, para não brigar com o reveal.
    <ul data-reveal className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
      <AnimatePresence initial={false}>
      {rows.map((t) => {
        const due = formatDue(t.due_on)
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
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm transition-colors outline-none hover:bg-hover focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <span className="min-w-0 flex-1 basis-60 text-foreground">{t.title}</span>
              {showProject && <span className="text-muted">{projectTitle.get(t.project_id) ?? '—'}</span>}
              <span className="text-muted">{(t.assignee_id && personName.get(t.assignee_id)) || 'Sem responsável'}</span>
              {t.sprint_id && <span className="font-mono text-xs text-muted">{sprintName.get(t.sprint_id)}</span>}
              {due && <span className="font-mono text-xs text-muted">{due}</span>}
              <ProgressCount taskId={t.id} />
              <span
                className={`font-mono text-xs tracking-wider uppercase ${t.status === 'done' ? 'text-accent' : 'text-label'}`}
              >
                {TASK_STATUS_LABEL[t.status]}
              </span>
            </button>
          </motion.li>
        )
      })}
      </AnimatePresence>
    </ul>
  )
}
