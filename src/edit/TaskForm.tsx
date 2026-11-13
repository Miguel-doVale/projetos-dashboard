import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/data/DataProvider'
import { ConfirmDelete } from '@/edit/ConfirmDelete'
import { Field, NativeSelect } from '@/edit/fields'
import { FormDialog } from '@/edit/FormDialog'
import { ItemsEditor, newItemRow } from '@/edit/ItemsEditor'
import type { ItemRow } from '@/edit/ItemsEditor'
import { nextPosition, orNull } from '@/edit/util'
import { remove, save } from '@/lib/api'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { ItemKind, Task, TaskStatus } from '@/lib/types'

interface Props {
  task?: Task
  /** Projeto pré-selecionado ao criar. */
  defaultProjectId?: string
  onClose: () => void
}

export function TaskForm({ task, defaultProjectId, onClose }: Props) {
  const { tasks, items, projects, people, sprints, reload } = useData()
  const own = items.filter((i) => i.task_id === task?.id)
  const rowsOf = (kind: ItemKind) =>
    own.filter((i) => i.kind === kind).sort((a, b) => a.position - b.position).map((i) => newItemRow(i.text, i.id))

  const [projectId, setProjectId] = useState(task?.project_id ?? defaultProjectId ?? projects[0]?.id ?? '')
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [assignee, setAssignee] = useState(task?.assignee_id ?? '')
  const [sprint, setSprint] = useState(task?.sprint_id ?? '')
  const [due, setDue] = useState(task?.due_on ?? '')
  const [scope, setScope] = useState(() => rowsOf('scope'))
  const [tests, setTests] = useState(() => rowsOf('test'))

  // Se o envio falhar no meio, o "Tentar de novo" continua do ponto em que parou, sem duplicar.
  const savedTaskId = useRef<string | null>(null)
  const savedItemIds = useRef(new Map<number, string>())
  const deleted = useRef(new Set<string>())

  async function submit() {
    if (!title.trim()) throw new Error('Informe o título.')
    if (!projectId) throw new Error('Escolha o projeto.')

    const fields = {
      project_id: projectId,
      title: title.trim(),
      description: orNull(description),
      status,
      assignee_id: orNull(assignee),
      sprint_id: orNull(sprint),
      due_on: orNull(due),
    }
    let id = task?.id ?? savedTaskId.current
    if (id) {
      await save('tasks', { id, ...fields })
    } else {
      const position = nextPosition(tasks.filter((t) => t.project_id === projectId))
      id = (await save('tasks', { ...fields, position })).id
      savedTaskId.current = id
    }

    // Item existente com o texto apagado sai do banco.
    const kept = new Set([...scope, ...tests].filter((r) => r.text.trim()).map((r) => r.id))
    for (const item of own) {
      if (!kept.has(item.id) && !deleted.current.has(item.id)) {
        await remove('task_items', item.id)
        deleted.current.add(item.id)
      }
    }
    let position = nextPosition(own)
    const write = async (kind: ItemKind, rows: ItemRow[]) => {
      for (const row of rows) {
        const text = row.text.trim()
        if (!text) continue
        const existing = row.id ?? savedItemIds.current.get(row.key)
        if (existing) {
          const before = own.find((i) => i.id === existing)
          if (!before || before.text !== text) await save('task_items', { id: existing, text })
        } else {
          const created = await save('task_items', { task_id: id, kind, text, done: false, position: position++ })
          savedItemIds.current.set(row.key, created.id)
        }
      }
    }
    await write('scope', scope)
    await write('test', tests)
    await reload()
  }

  return (
    <FormDialog title={task ? 'Editar tarefa' : 'Nova tarefa'} onSubmit={submit} onClose={onClose}>
      <Field label="Título">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Projeto">
          <NativeSelect value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.number} · {p.title}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Responsável">
          <NativeSelect value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Sem responsável</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Sprint">
          <NativeSelect value={sprint} onChange={(e) => setSprint(e.target.value)}>
            <option value="">Sem sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Prazo">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <Field label="Descrição">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>
      <ItemsEditor label="Escopo" value={scope} onChange={setScope} />
      <ItemsEditor label="Testes" value={tests} onChange={setTests} />
    </FormDialog>
  )
}

/** Botões do dono dentro do painel da tarefa: editar e excluir. */
export function TaskOwnerActions({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { tasks } = useData()
  const [editing, setEditing] = useState(false)
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null
  return (
    <div className="flex gap-2 border-t border-border pt-5">
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        Editar tarefa
      </Button>
      <ConfirmDelete
        table="tasks"
        id={task.id}
        name={task.title}
        consequence="Os itens de escopo e de teste desta tarefa também serão apagados."
        label="Excluir tarefa"
        onDeleted={onClose}
      />
      {editing && <TaskForm task={task} onClose={() => setEditing(false)} />}
    </div>
  )
}
