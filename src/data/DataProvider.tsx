import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { useAuth } from '@/auth/AuthProvider'
import { db } from '@/lib/firebase'
import { decodeFromFirestore } from '@/lib/firestoreCodec'
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
  /** Verdadeiro depois do primeiro carregamento completo. */
  loaded: boolean
  people: Person[]
  projects: Project[]
  members: ProjectMember[]
  sprints: Sprint[]
  tasks: Task[]
  items: TaskItem[]
  pages: Page[]
  /** UIDs em `members`. Só o dono consegue listar; para os demais fica vazio. */
  memberUids: string[]
  reload(): Promise<void>
}

type Loaded = Omit<DataState, 'loading' | 'error' | 'loaded' | 'reload'>

const EMPTY: Loaded = {
  people: [],
  projects: [],
  members: [],
  sprints: [],
  tasks: [],
  items: [],
  pages: [],
  memberUids: [],
}

// Tabelas que têm coluna `position` são ordenadas por ela.
const ORDERED: Partial<Record<TableName, true>> = {
  projects: true,
  tasks: true,
  task_items: true,
  pages: true,
}

type Raw = { id: string; position?: number; created_at?: string | null }

async function fetchTable<T>(table: TableName): Promise<T[]> {
  const snap = await getDocs(collection(db, table))
  const rows = snap.docs.map((d) => ({ ...decodeFromFirestore(d.data()), id: d.id }) as unknown as Raw)
  if (ORDERED[table]) {
    rows.sort(
      (a, b) =>
        (a.position ?? 0) - (b.position ?? 0) || (a.created_at ?? '').localeCompare(b.created_at ?? ''),
    )
  }
  return rows as unknown as T[]
}

async function fetchMemberUids(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, 'members'))
    return snap.docs.map((d) => d.id)
  } catch {
    return []
  }
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { access } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [data, setData] = useState<Loaded>(EMPTY)
  const mounted = useRef(true)
  const latest = useRef(0)
  const hasData = useRef(false)

  const reload = useCallback(async () => {
    const run = ++latest.current
    setError(null)
    // Sem dados ainda (primeira carga ou nova tentativa): volta para "Carregando…".
    if (!hasData.current) setLoading(true)
    try {
      const [people, projects, members, sprints, tasks, items, pages, memberUids] = await Promise.all([
        fetchTable<Person>('people'),
        fetchTable<Project>('projects'),
        fetchTable<ProjectMember>('project_members'),
        fetchTable<Sprint>('sprints'),
        fetchTable<Task>('tasks'),
        fetchTable<TaskItem>('task_items'),
        fetchTable<Page>('pages'),
        access === 'owner' ? fetchMemberUids() : Promise.resolve<string[]>([]),
      ])
      // Resposta fora de ordem: só a mais recente vale.
      if (!mounted.current || run !== latest.current) return
      hasData.current = true
      setData({ people, projects, members, sprints, tasks, items, pages, memberUids })
      setLoaded(true)
      setLoading(false)
    } catch {
      if (!mounted.current || run !== latest.current) return
      setError('Não foi possível carregar os dados.')
      setLoading(false)
    }
  }, [access])

  useEffect(() => {
    mounted.current = true
    void reload()
    return () => {
      mounted.current = false
    }
  }, [reload])

  const value = useMemo<DataState>(
    () => ({ loading, error, loaded, ...data, reload }),
    [loading, error, loaded, data, reload],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData precisa estar dentro de <DataProvider>.')
  return ctx
}
