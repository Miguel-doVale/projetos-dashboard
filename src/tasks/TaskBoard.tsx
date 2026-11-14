import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { Announcements, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { usePointerGlow } from '@/fx/usePointerGlow'
import { motionEnabled } from '@/lib/motion'
import { useData } from '@/data/DataProvider'
import { setTaskStatus } from '@/lib/api'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Task } from '@/lib/types'
import { groupByProject, ProgressCount } from '@/tasks/TaskList'
import { TaskStatusIcon } from '@/tasks/TaskStatusIcon'

const COLUMNS: Task['status'][] = ['todo', 'doing', 'done']

/** Quantas tarefas cada projeto mostra por coluna antes do "mostrar mais": mantém o quadro curto. */
export const BOARD_PREVIEW = 2

const isStatus = (v: unknown): v is Task['status'] => typeof v === 'string' && (COLUMNS as string[]).includes(v)

/** Para onde a tarefa vai ao soltar: a coluna sob o cursor, ou `null` se soltou fora ou na mesma coluna. */
export function dropTarget(current: Task['status'], overId: unknown): Task['status'] | null {
  return isStatus(overId) && overId !== current ? overId : null
}

/**
 * Arrastar um card para outra coluna muda o status da tarefa (como no Trello).
 * Dono e membros podem: é a mesma escrita que o menu de status do painel (`setTaskStatus`).
 * A mudança aparece na hora; se o salvamento falhar, o card volta e a mensagem aparece acima do quadro.
 */
export function TaskBoard({ tasks, onOpen }: { tasks: Task[]; onOpen: (taskId: string) => void }) {
  const { projects, reload } = useData()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [moved, setMoved] = useState<Map<string, Task['status']>>(() => new Map())
  const [dragging, setDragging] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    // Só começa a arrastar depois de 6 px: um clique simples continua abrindo a tarefa.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // No toque, segurar um instante para arrastar; deslizar direto continua rolando a página.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    // Teclado: Espaço pega o card, setas movem entre colunas, Espaço solta, Esc cancela. Enter continua abrindo.
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const view = tasks.map((t) => (moved.has(t.id) ? { ...t, status: moved.get(t.id)! } : t))
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const onDragStart = ({ active }: DragStartEvent) => {
    setError(null)
    setDragging(view.find((t) => t.id === active.id) ?? null)
  }

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const task = view.find((t) => t.id === active.id)
    const target = task ? dropTarget(task.status, over?.id) : null
    if (!task || !target) return
    const id = task.id
    setMoved((prev) => new Map(prev).set(id, target))
    try {
      await setTaskStatus(id, target)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível mover a tarefa.')
    } finally {
      // Depois do reload os dados já trazem o status novo; em caso de erro, o card volta para onde estava.
      setMoved((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    }
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Movendo a tarefa ${titleOf(active.id)}.`,
    onDragOver: ({ over }) => (over && isStatus(over.id) ? `Sobre a coluna ${TASK_STATUS_LABEL[over.id]}.` : 'Fora das colunas.'),
    onDragEnd: ({ over }) => (over && isStatus(over.id) ? `Tarefa movida para ${TASK_STATUS_LABEL[over.id]}.` : 'Tarefa não movida.'),
    onDragCancel: () => 'Movimento cancelado.',
  }
  const titleOf = (id: string | number) => view.find((t) => t.id === id)?.title ?? ''

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Enter abre a tarefa. Espaço pega o card; use as setas para trocar de coluna e Espaço para soltar, ou Esc para cancelar.',
        },
      }}
    >
      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        {COLUMNS.map((status) => {
          const column = view.filter((t) => t.status === status)
          const groups = groupByProject(column, projects)
          return (
            <BoardColumn key={status} status={status} count={column.length} dragging={dragging !== null}>
              {groups.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted/70">Nada aqui.</p>}
              <div className="space-y-4">
                {groups.map((g) => {
                  const key = groupKey(status, g.project?.id)
                  const open = expanded.has(key)
                  return (
                    <div key={g.project?.id ?? 'sem-projeto'}>
                      {/* Cabeçalho do projeto dentro da coluna: o nome sai de cada card e aparece uma vez só. */}
                      <h3 className="mb-2 flex items-center gap-2 border-b border-border px-1 pb-1.5 text-xs text-muted">
                        {g.project && <span className="font-mono text-foreground/70">{g.project.number}</span>}
                        <span className="min-w-0 truncate">{g.project?.title ?? 'Sem projeto'}</span>
                        <span className="ml-auto font-mono">{g.tasks.length}</span>
                      </h3>
                      <ul className="space-y-2">
                        <AnimatePresence initial={false}>
                          {(open ? g.tasks : g.tasks.slice(0, BOARD_PREVIEW)).map((t) => (
                            <BoardCard
                              key={t.id}
                              task={t}
                              projectTitle={g.project?.title ?? 'Sem projeto'}
                              onOpen={onOpen}
                              isDragging={dragging?.id === t.id}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                      {g.tasks.length > BOARD_PREVIEW && (
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => toggle(key)}
                          className="mt-2 w-full rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted outline-none hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                          {open ? 'Mostrar menos' : `Mostrar mais ${g.tasks.length - BOARD_PREVIEW}`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </BoardColumn>
          )
        })}
      </div>
      {/* Cópia que acompanha o cursor: o card original fica apagado no lugar até soltar. */}
      <DragOverlay dropAnimation={motionEnabled() ? { duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' } : null}>
        {dragging ? (
          <div className="rotate-[1.5deg] cursor-grabbing rounded-xl border border-accent/60 bg-surface-raised px-3 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
            <CardBody task={dragging} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({
  status,
  count,
  dragging,
  children,
}: {
  status: Task['status']
  count: number
  dragging: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section
      ref={setNodeRef}
      data-reveal
      data-over={isOver ? 'true' : undefined}
      aria-label={TASK_STATUS_LABEL[status]}
      className={`rounded-xl border bg-surface p-3 transition-colors ${
        isOver ? 'border-accent/70 bg-accent/[0.04]' : dragging ? 'border-dashed border-border' : 'border-border'
      }`}
    >
      <h2 className="mb-3 flex items-center justify-between gap-2 px-1 font-mono text-xs tracking-widest text-label uppercase">
        <span className="flex items-center gap-2">
          <TaskStatusIcon status={status} />
          {TASK_STATUS_LABEL[status]}
        </span>
        <span className="text-muted">{count}</span>
      </h2>
      {children}
    </section>
  )
}

function BoardCard({
  task,
  projectTitle,
  onOpen,
  isDragging,
}: {
  task: Task
  projectTitle: string
  onOpen: (taskId: string) => void
  isDragging: boolean
}) {
  const animate = motionEnabled()
  const glow = usePointerGlow()
  const { setNodeRef, attributes, listeners } = useDraggable({ id: task.id })
  return (
    // layoutId: ao trocar de coluna, o card desliza para a nova posição. A coluna (data-reveal) é quem faz o reveal; o item só anima layout.
    <motion.li
      layoutId={animate ? `task-${task.id}` : undefined}
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: isDragging ? 0.35 : 1 }}
      exit={animate ? { opacity: 0, pointerEvents: 'none', transition: { duration: 0.1 } } : undefined}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
    >
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onOpen(task.id)}
        {...glow}
        {...attributes}
        {...listeners}
        aria-roledescription="tarefa arrastável"
        className="fx-card w-full cursor-grab touch-manipulation rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-left transition-colors outline-none select-none hover:border-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <CardBody task={task} />
        <span className="sr-only"> — {projectTitle}</span>
      </button>
    </motion.li>
  )
}

function CardBody({ task }: { task: Task }) {
  const { people, items } = useData()
  const name = task.assignee_id ? people.find((p) => p.id === task.assignee_id)?.name : undefined
  const hasItems = items.some((i) => i.task_id === task.id)
  return (
    <>
      <span className={`block text-sm leading-snug ${task.status === 'done' ? 'text-muted' : 'text-foreground'}`}>{task.title}</span>
      {/* Card enxuto: só mostra a linha de baixo quando há responsável ou itens, para a coluna não crescer à toa. */}
      {name || hasItems ? (
        <span className="mt-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-foreground/80">{name ?? ''}</span>
          <ProgressCount taskId={task.id} />
        </span>
      ) : null}
    </>
  )
}

function groupKey(status: Task['status'], projectId: string | undefined): string {
  return `${status}:${projectId ?? 'sem-projeto'}`
}
