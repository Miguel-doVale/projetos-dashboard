import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/fx/EmptyState'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useData } from '@/data/DataProvider'
import { setItemDone, setTaskStatus } from '@/lib/api'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { ItemKind, Task, TaskItem } from '@/lib/types'
import { formatDue, sortTasks } from '@/tasks/filters'

/** Tarefa aberta na URL (`?t=<id>`), preservando os demais parâmetros. */
export function useOpenTask(): [string | null, (id: string) => void, () => void] {
  const [params, setParams] = useSearchParams()
  const open = useCallback(
    (id: string) =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.set('t', id)
        return next
      }),
    [setParams],
  )
  const close = useCallback(
    () =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        next.delete('t')
        return next
      }),
    [setParams],
  )
  return [params.get('t'), open, close]
}

/**
 * Valores otimistas por chave: aplicados por cima dos dados do provider até a
 * chamada e o `reload` terminarem; em falha, somem e o erro fica à mostra.
 */
function useOverrides<V>(reload: () => Promise<void>, setError: (message: string | null) => void) {
  const [values, setValues] = useState<Record<string, V>>({})
  const seq = useRef<Record<string, number>>({})

  const apply = useCallback(
    async (key: string, next: V, action: () => Promise<void>) => {
      const mine = (seq.current[key] = (seq.current[key] ?? 0) + 1)
      setError(null)
      setValues((v) => ({ ...v, [key]: next }))
      try {
        await action()
        await reload()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível salvar. Tente de novo.')
      } finally {
        // Só solta se nenhuma chamada mais nova usou a mesma chave.
        if (seq.current[key] === mine) {
          setValues((v) => {
            const { [key]: _gone, ...rest } = v
            return rest
          })
        }
      }
    },
    [reload, setError],
  )
  return { values, apply }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] tracking-wider text-label uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}

interface ChecklistProps {
  title: string
  items: TaskItem[]
  doneOf: (item: TaskItem) => boolean
  onToggle: (item: TaskItem, done: boolean) => void
}

function Checklist({ title, items, doneOf, onToggle }: ChecklistProps) {
  const done = items.filter(doneOf).length
  return (
    <section aria-label={title} className="space-y-3">
      <h3 className="flex items-baseline justify-between font-mono text-xs tracking-widest text-label uppercase">
        {title}
        {items.length > 0 && <span className="text-muted">{done}/{items.length}</span>}
      </h3>
      {items.length === 0 ? (
        <EmptyState compact>Nenhum item.</EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const checked = doneOf(item)
            return (
              <li key={item.id} className="flex items-start gap-3">
                <Checkbox
                  id={`item-${item.id}`}
                  checked={checked}
                  onCheckedChange={(c) => onToggle(item, c === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor={`item-${item.id}`}
                  className={`flex-1 cursor-pointer text-sm leading-snug ${checked ? 'text-muted line-through decoration-muted/60' : 'text-foreground/90'}`}
                >
                  {item.text}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

interface Props {
  taskId: string | null
  onClose: () => void
  /** Ponto de extensão da Tarefa 7: ações que só o dono vê. */
  ownerActions?: ReactNode
}

export function TaskSheet({ taskId, onClose, ownerActions }: Props) {
  const { tasks } = useData()
  const task = taskId ? tasks.find((t) => t.id === taskId) : undefined
  if (!task) return null
  // A chave zera erro e valores otimistas ao trocar de tarefa.
  return <TaskSheetBody key={task.id} task={task} onClose={onClose} ownerActions={ownerActions} />
}

function TaskSheetBody({ task, onClose, ownerActions }: { task: Task; onClose: () => void; ownerActions?: ReactNode }) {
  const { items, projects, people, sprints, reload } = useData()
  // Um único erro para itens e status: a ação mais recente sempre vence.
  const [error, setError] = useState<string | null>(null)
  const done = useOverrides<boolean>(reload, setError)
  const status = useOverrides<Task['status']>(reload, setError)
  const project = projects.find((p) => p.id === task.project_id)
  const assignee = people.find((p) => p.id === task.assignee_id)
  const sprint = sprints.find((s) => s.id === task.sprint_id)
  const due = formatDue(task.due_on)
  const current = status.values[task.id] ?? task.status
  const own = sortTasks(items.filter((i) => i.task_id === task.id))
  const ofKind = (kind: ItemKind) => own.filter((i) => i.kind === kind)
  const doneOf = (i: TaskItem) => done.values[i.id] ?? i.done

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto border-border data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:min-[720px]:max-w-[520px]"
      >
        <SheetHeader className="gap-2 border-b border-border p-5 pr-5">
          <div className="flex items-center justify-between gap-3">
            <SheetDescription className="font-mono text-xs tracking-wider text-label uppercase">
              {project ? `${project.number} · ${project.title}` : 'Tarefa'}
            </SheetDescription>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
          <SheetTitle className="text-xl leading-tight font-[650] tracking-tight">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-8 p-5">
          {error && (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Status">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label={`Status: ${TASK_STATUS_LABEL[current]}`}>
                    {TASK_STATUS_LABEL[current]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={current}
                    onValueChange={(v) => {
                      const next = v as Task['status']
                      if (next !== current) void status.apply(task.id, next, () => setTaskStatus(task.id, next))
                    }}
                  >
                    {(Object.keys(TASK_STATUS_LABEL) as Task['status'][]).map((s) => (
                      <DropdownMenuRadioItem key={s} value={s}>
                        {TASK_STATUS_LABEL[s]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>
            <Field label="Responsável">{assignee?.name ?? 'Sem responsável'}</Field>
            <Field label="Sprint">{sprint?.name ?? 'Sem sprint'}</Field>
            <Field label="Prazo">{due ?? 'Sem prazo'}</Field>
          </dl>

          {task.description && (
            <section aria-label="Descrição" className="space-y-2">
              <h3 className="font-mono text-xs tracking-widest text-label uppercase">Descrição</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{task.description}</p>
            </section>
          )}

          <Checklist
            title="Escopo"
            items={ofKind('scope')}
            doneOf={doneOf}
            onToggle={(item, next) => void done.apply(item.id, next, () => setItemDone(item.id, next))}
          />
          <Checklist
            title="Testes"
            items={ofKind('test')}
            doneOf={doneOf}
            onToggle={(item, next) => void done.apply(item.id, next, () => setItemDone(item.id, next))}
          />

          {ownerActions}
        </div>
      </SheetContent>
    </Sheet>
  )
}
