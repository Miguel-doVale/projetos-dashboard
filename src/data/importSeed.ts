import { collection, doc, getDocs, limit, query } from 'firebase/firestore'
import { runBatched } from '@/lib/api'
import type { WriteOp } from '@/lib/api'
import { db } from '@/lib/firebase'
import { seedData } from '@/data/seedData'

/** Grava o conteúdo inicial, resolvendo as referências (número do projeto, nome da pessoa) para ids novos. */
export async function importSeed(): Promise<void> {
  const existing = await getDocs(query(collection(db, 'projects'), limit(1)))
  if (!existing.empty) throw new Error('O banco já tem conteúdo.')

  const now = new Date().toISOString()
  const ops: WriteOp[] = []
  const add = (table: string, data: Record<string, unknown>) => {
    const ref = doc(collection(db, table))
    ops.push({ type: 'set', ref, data: { ...data, created_at: now } })
    return ref.id
  }

  const personId = new Map(seedData.people.map((p) => [p.name, add('people', p)]))
  const projectId = new Map(
    seedData.projects.map((p) => [p.number, add('projects', p)]),
  )
  const need = (map: Map<string, string>, key: string) => {
    const id = map.get(key)
    if (!id) throw new Error(`Referência desconhecida no conteúdo inicial: ${key}`)
    return id
  }
  for (const { project, person, ...m } of seedData.members) {
    add('project_members', { ...m, project_id: need(projectId, project), person_id: need(personId, person) })
  }
  for (const { project, ...t } of seedData.tasks) {
    add('tasks', { ...t, project_id: need(projectId, project), assignee_id: null, sprint_id: null, due_on: null })
  }
  for (const page of seedData.pages) add('pages', page)

  await runBatched(ops)
}
