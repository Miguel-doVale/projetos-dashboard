import { AnimatePresence, motion } from 'motion/react'
import { usePointerGlow } from '@/fx/usePointerGlow'
import { motionEnabled } from '@/lib/motion'
import { useData } from '@/data/DataProvider'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Task } from '@/lib/types'
import { sortTasks } from '@/tasks/filters'
import { ProgressCount } from '@/tasks/TaskList'

const COLUMNS: Task['status'][] = ['todo', 'doing', 'done']

export function TaskBoard({ tasks, onOpen }: { tasks: Task[]; onOpen: (taskId: string) => void }) {
  const { projects, people } = useData()
  const animate = motionEnabled()
  const glow = usePointerGlow()
  const projectTitle = new Map(projects.map((p) => [p.id, p.title]))
  const personName = new Map(people.map((p) => [p.id, p.name]))

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((status) => {
        const column = sortTasks(tasks.filter((t) => t.status === status))
        return (
          <section key={status} data-reveal aria-label={TASK_STATUS_LABEL[status]} className="rounded-xl border border-border bg-surface p-3">
            <h2 className="mb-3 flex items-baseline justify-between px-1 font-mono text-xs tracking-widest text-label uppercase">
              {TASK_STATUS_LABEL[status]}
              <span className="text-muted">{column.length}</span>
            </h2>
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
              {column.map((t) => (
                // layoutId: a tarefa que muda de coluna desliza para a nova. A coluna (data-reveal) é quem faz o reveal; o item só anima layout.
                <motion.li
                  key={t.id}
                  layoutId={animate ? `task-${t.id}` : undefined}
                  initial={animate ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  exit={animate ? { opacity: 0, pointerEvents: 'none', transition: { duration: 0.1 } } : undefined}
                  transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(t.id)}
                    {...glow}
                    className="fx-card w-full rounded-xl border border-border bg-surface-raised p-3 text-left transition-colors outline-none hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    <span className="block text-sm text-foreground">{t.title}</span>
                    <span className="mt-1 block text-xs text-muted">{projectTitle.get(t.project_id) ?? '—'}</span>
                    <span className="mt-2 flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{(t.assignee_id && personName.get(t.assignee_id)) || 'Sem responsável'}</span>
                      <ProgressCount taskId={t.id} />
                    </span>
                  </button>
                </motion.li>
              ))}
              </AnimatePresence>
            </ul>
          </section>
        )
      })}
    </div>
  )
}
