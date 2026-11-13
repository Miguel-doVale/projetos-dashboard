import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Page,
  Person,
  Project,
  ProjectMember,
  Sprint,
  Task,
  TaskItem,
  TableName,
} from '@/lib/types'

export interface DataState {
  loading: boolean
  error: string | null
  people: Person[]
  projects: Project[]
  members: ProjectMember[]
  sprints: Sprint[]
  tasks: Task[]
  items: TaskItem[]
  pages: Page[]
  reload(): Promise<void>
}

type Loaded = Omit<DataState, 'loading' | 'error' | 'reload'>

const EMPTY: Loaded = {
  people: [],
  projects: [],
  members: [],
  sprints: [],
  tasks: [],
  items: [],
  pages: [],
}

// Tabelas que têm coluna `position` são ordenadas por ela.
const ORDERED: Partial<Record<TableName, true>> = {
  projects: true,
  tasks: true,
  task_items: true,
  pages: true,
}

async function fetchTable<T>(table: TableName): Promise<T[]> {
  const query = supabase.from(table).select('*')
  const { data, error } = await (ORDERED[table] ? query.order('position') : query)
  if (error) throw new Error(error.message)
  return (data ?? []) as T[]
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Loaded>(EMPTY)
  const mounted = useRef(true)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const [people, projects, members, sprints, tasks, items, pages] = await Promise.all([
        fetchTable<Person>('people'),
        fetchTable<Project>('projects'),
        fetchTable<ProjectMember>('project_members'),
        fetchTable<Sprint>('sprints'),
        fetchTable<Task>('tasks'),
        fetchTable<TaskItem>('task_items'),
        fetchTable<Page>('pages'),
      ])
      if (mounted.current) setData({ people, projects, members, sprints, tasks, items, pages })
    } catch {
      if (mounted.current) setError('Não foi possível carregar os dados.')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void reload()
    return () => {
      mounted.current = false
    }
  }, [reload])

  const value = useMemo<DataState>(
    () => ({ loading, error, ...data, reload }),
    [loading, error, data, reload],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData precisa estar dentro de <DataProvider>.')
  return ctx
}
