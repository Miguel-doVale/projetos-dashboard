import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Person, Task } from '@/lib/types'

// Lista somente leitura; a Tarefa 6 troca por lista real + painel de detalhe.
export function ProjectTasks({ tasks, people }: { tasks: Task[]; people: Person[] }) {
  const names = new Map(people.map((p) => [p.id, p.name]))
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-raised">
      {tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
          <span className="min-w-0 flex-1 text-foreground">{t.title}</span>
          <span className="font-mono text-xs tracking-wider text-label uppercase">{TASK_STATUS_LABEL[t.status]}</span>
          <span className="w-36 text-right text-muted">{(t.assignee_id && names.get(t.assignee_id)) || '—'}</span>
        </li>
      ))}
    </ul>
  )
}
