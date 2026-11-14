import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePointerGlow } from '@/fx/usePointerGlow'
import { motionEnabled } from '@/lib/motion'
import { useData } from '@/data/DataProvider'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Task } from '@/lib/types'
import { groupByProject, ProgressCount } from '@/tasks/TaskList'
import { TaskStatusIcon } from '@/tasks/TaskStatusIcon'

const COLUMNS: Task['status'][] = ['todo', 'doing', 'done']

/** Quantas tarefas cada projeto mostra por coluna antes do "mostrar mais": mantém o quadro curto. */
export const BOARD_PREVIEW = 3

export function TaskBoard({ tasks, onOpen }: { tasks: Task[]; onOpen: (taskId: string) => void }) {
  const { projects, people } = useData()
  const animate = motionEnabled()
  const glow = usePointerGlow()
  const personName = new Map(people.map((p) => [p.id, p.name]))
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
      {COLUMNS.map((status) => {
        const column = tasks.filter((t) => t.status === status)
        const groups = groupByProject(column, projects)
        return (
          <section key={status} data-reveal aria-label={TASK_STATUS_LABEL[status]} className="rounded-xl border border-border bg-surface p-3">
            <h2 className="mb-3 flex items-center justify-between gap-2 px-1 font-mono text-xs tracking-widest text-label uppercase">
              <span className="flex items-center gap-2">
                <TaskStatusIcon status={status} />
                {TASK_STATUS_LABEL[status]}
              </span>
              <span className="text-muted">{column.length}</span>
            </h2>
            {groups.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted/70">Nada aqui.</p>}
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g.project?.id ?? 'sem-projeto'}>
                  {/* Cabeçalho do projeto dentro da coluna: o nome sai de cada card e aparece uma vez só. */}
                  <h3 className="mb-2 flex items-center gap-2 border-b border-border px-1 pb-1.5 text-xs text-muted">
                    {g.project && <span className="font-mono text-foreground/70">{g.project.number}</span>}
                    <span className="min-w-0 truncate">{g.project?.title ?? 'Sem projeto'}</span>
                    <span className="ml-auto font-mono">{g.tasks.length}</span>
                  </h3>
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {(expanded.has(groupKey(status, g.project?.id)) ? g.tasks : g.tasks.slice(0, BOARD_PREVIEW)).map((t) => (
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
                            <span className={`block text-sm leading-snug ${t.status === 'done' ? 'text-muted' : 'text-foreground'}`}>
                              {t.title}
                            </span>
                            <span className="sr-only"> — {g.project?.title ?? 'Sem projeto'}</span>
                            <span className="mt-2 flex items-center justify-between gap-2 text-xs">
                              {t.assignee_id && personName.get(t.assignee_id) ? (
                                <span className="text-foreground/80">{personName.get(t.assignee_id)}</span>
                              ) : (
                                <span className="text-muted/70">Sem responsável</span>
                              )}
                              <ProgressCount taskId={t.id} />
                            </span>
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  {g.tasks.length > BOARD_PREVIEW && (
                    <button
                      type="button"
                      aria-expanded={expanded.has(groupKey(status, g.project?.id))}
                      onClick={() => toggle(groupKey(status, g.project?.id))}
                      className="mt-2 w-full rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {expanded.has(groupKey(status, g.project?.id))
                        ? 'Mostrar menos'
                        : `Mostrar mais ${g.tasks.length - BOARD_PREVIEW}`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function groupKey(status: Task['status'], projectId: string | undefined): string {
  return `${status}:${projectId ?? 'sem-projeto'}`
}
