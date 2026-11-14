import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { SprintManager } from '@/edit/SprintManager'
import { TaskForm, TaskOwnerActions } from '@/edit/TaskForm'
import { SplitTitle } from '@/fx/SplitTitle'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useData } from '@/data/DataProvider'
import { TASK_STATUS_LABEL } from '@/lib/derive'
import type { Task } from '@/lib/types'
import { filterFromSearch, filterTasks, searchFromFilter } from '@/tasks/filters'
import type { TaskFilter } from '@/tasks/filters'
import { TaskBoard } from '@/tasks/TaskBoard'
import { EmptyTasks, TaskList } from '@/tasks/TaskList'
import { TaskSheet, useOpenTask } from '@/tasks/TaskSheet'

const ALL = 'all'

interface FilterSelectProps {
  label: string
  value: string | undefined
  allLabel: string
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}

function FilterSelect({ label, value, allLabel, options, onChange }: FilterSelectProps) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label={label} className="min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function Tasks() {
  const { tasks, projects, sprints, people } = useData()
  const [params, setParams] = useSearchParams()
  const [openId, openTask, closeTask] = useOpenTask()
  const owner = useAuth().access === 'owner'
  const [newTask, setNewTask] = useState(false)
  const [sprintsOpen, setSprintsOpen] = useState(false)
  const board = params.get('v') === 'quadro'
  const filter = filterFromSearch(params)
  const visible = filterTasks(tasks, filter)
  const filtered = Object.keys(filter).length > 0

  // Os filtros substituem os seus parâmetros; visão (`v`) e tarefa aberta (`t`) ficam.
  function update(next: TaskFilter) {
    const out = searchFromFilter(next)
    for (const key of ['v', 't']) {
      const kept = params.get(key)
      if (kept) out.set(key, kept)
    }
    setParams(out)
  }
  const change = (patch: Partial<TaskFilter>) => update({ ...filter, ...patch })

  function setView(quadro: boolean) {
    const out = new URLSearchParams(params)
    if (quadro) out.set('v', 'quadro')
    else out.delete('v')
    setParams(out)
  }

  return (
    <div className="space-y-8">
      <header className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SplitTitle className="text-4xl leading-[1.05] font-[650] tracking-tight text-foreground sm:text-5xl">Tarefas</SplitTitle>
          {owner && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSprintsOpen(true)}>
                Sprints
              </Button>
              <Button onClick={() => setNewTask(true)}>Nova tarefa</Button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Visão" className="flex rounded-lg border border-border p-0.5">
            <Button variant={board ? 'ghost' : 'secondary'} size="sm" aria-pressed={!board} onClick={() => setView(false)}>
              Lista
            </Button>
            <Button variant={board ? 'secondary' : 'ghost'} size="sm" aria-pressed={board} onClick={() => setView(true)}>
              Quadro
            </Button>
          </div>
          <FilterSelect
            label="Projeto"
            value={filter.project}
            allLabel="Todos os projetos"
            options={projects.map((p) => ({ value: p.id, label: p.title }))}
            onChange={(project) => change({ project })}
          />
          <FilterSelect
            label="Sprint"
            value={filter.sprint}
            allLabel="Todas as sprints"
            options={[{ value: 'none', label: 'Sem sprint' }, ...sprints.map((s) => ({ value: s.id, label: s.name }))]}
            onChange={(sprint) => change({ sprint })}
          />
          <FilterSelect
            label="Pessoa"
            value={filter.assignee}
            allLabel="Todas as pessoas"
            options={[{ value: 'none', label: 'Sem responsável' }, ...people.map((p) => ({ value: p.id, label: p.name }))]}
            onChange={(assignee) => change({ assignee })}
          />
          <FilterSelect
            label="Status"
            value={filter.status}
            allLabel="Todos os status"
            options={(Object.keys(TASK_STATUS_LABEL) as Task['status'][]).map((s) => ({ value: s, label: TASK_STATUS_LABEL[s] }))}
            onChange={(status) => change({ status: status as Task['status'] | undefined })}
          />
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => update({})}>
              Limpar filtros
            </Button>
          )}
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyTasks />
      ) : board ? (
        <TaskBoard tasks={visible} onOpen={openTask} />
      ) : (
        <TaskList tasks={visible} onOpen={openTask} />
      )}

      <TaskSheet
        taskId={openId}
        onClose={closeTask}
        ownerActions={owner && openId ? <TaskOwnerActions taskId={openId} onClose={closeTask} /> : undefined}
      />
      {newTask && <TaskForm defaultProjectId={filter.project} onClose={() => setNewTask(false)} />}
      {sprintsOpen && <SprintManager onClose={() => setSprintsOpen(false)} />}
    </div>
  )
}
