import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { DocumentReference } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { decodeFromFirestore, encodeForFirestore } from '@/lib/firestoreCodec'
import type { Person, Row, TableName, Task } from '@/lib/types'

// Limite do Firestore por lote de escrita.
const BATCH_LIMIT = 500
// Limite do operador `in` em consultas.
const IN_LIMIT = 30

export type WriteOp =
  | { type: 'set'; ref: DocumentReference; data: Record<string, unknown> }
  | { type: 'update'; ref: DocumentReference; data: Record<string, unknown> }
  | { type: 'delete'; ref: DocumentReference }

/** Aplica as operações em lotes de até 500. Cada lote é atômico; o conjunto, não. */
export async function runBatched(ops: WriteOp[]): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      if (op.type === 'set') batch.set(op.ref, encodeForFirestore(op.data))
      else if (op.type === 'update') batch.update(op.ref, encodeForFirestore(op.data))
      else batch.delete(op.ref)
    }
    await batch.commit()
  }
}

async function guard<T>(fallback: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    const code = (error as { code?: string } | null)?.code
    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
      throw new Error('Você não tem permissão para fazer isso.')
    }
    throw new Error(fallback)
  }
}

async function idsWhere(table: TableName, field: string, values: string[]) {
  const refs: DocumentReference[] = []
  for (let i = 0; i < values.length; i += IN_LIMIT) {
    const snap = await getDocs(query(collection(db, table), where(field, 'in', values.slice(i, i + IN_LIMIT))))
    refs.push(...snap.docs.map((d) => d.ref))
  }
  return refs
}

async function refsWhere(table: TableName, field: string, value: string) {
  const snap = await getDocs(query(collection(db, table), where(field, '==', value)))
  return snap.docs.map((d) => d.ref)
}

/** Operações que apagam os dependentes e, por último, o próprio documento. */
async function removalOps(table: TableName, id: string): Promise<WriteOp[]> {
  const ops: WriteOp[] = []
  const del = (refs: DocumentReference[]) => refs.forEach((ref) => ops.push({ type: 'delete', ref }))
  const clear = (refs: DocumentReference[], field: string) =>
    refs.forEach((ref) => ops.push({ type: 'update', ref, data: { [field]: null } }))

  if (table === 'projects') {
    const tasks = await refsWhere('tasks', 'project_id', id)
    del(await idsWhere('task_items', 'task_id', tasks.map((t) => t.id)))
    del(tasks)
    del(await refsWhere('project_members', 'project_id', id))
  } else if (table === 'tasks') {
    del(await refsWhere('task_items', 'task_id', id))
  } else if (table === 'people') {
    del(await refsWhere('project_members', 'person_id', id))
    const snap = await getDoc(doc(db, 'people', id))
    const uid = (snap.data() as Partial<Person> | undefined)?.uid
    if (uid) ops.push({ type: 'delete', ref: doc(db, 'members', uid) })
    clear(await refsWhere('tasks', 'assignee_id', id), 'assignee_id')
  } else if (table === 'sprints') {
    clear(await refsWhere('tasks', 'sprint_id', id), 'sprint_id')
  }
  ops.push({ type: 'delete', ref: doc(db, table, id) })
  return ops
}

export async function save<T extends TableName>(table: T, row: Partial<Row<T>>): Promise<Row<T>> {
  const { id, ...fields } = row as Partial<Row<T>> & { id?: string }
  return guard('Não foi possível salvar. Tente de novo.', async () => {
    if (id) {
      const ref = doc(db, table, id)
      await updateDoc(ref, encodeForFirestore(fields as Record<string, unknown>))
      const snap = await getDoc(ref)
      return { ...decodeFromFirestore(snap.data()), id } as Row<T>
    }
    const data = { ...fields, created_at: new Date().toISOString() }
    const ref = await addDoc(collection(db, table), encodeForFirestore(data))
    return { ...data, id: ref.id } as unknown as Row<T>
  })
}

export async function remove(table: TableName, id: string): Promise<void> {
  await guard('Não foi possível excluir. Tente de novo.', async () => {
    await runBatched(await removalOps(table, id))
  })
}

export async function setProjectTeam(
  projectId: string,
  team: { person_id: string; role: string | null; is_lead: boolean }[],
): Promise<void> {
  const personIds = team.map((m) => m.person_id)
  if (new Set(personIds).size !== personIds.length) {
    throw new Error('Há pessoas repetidas na equipe.')
  }
  await guard('Não foi possível atualizar a equipe. Tente de novo.', async () => {
    const snap = await getDocs(query(collection(db, 'project_members'), where('project_id', '==', projectId)))
    const existing = new Map(snap.docs.map((d) => [(d.data() as { person_id: string }).person_id, d.ref]))
    const batch = writeBatch(db)
    for (const [personId, ref] of existing) {
      if (!personIds.includes(personId)) batch.delete(ref)
    }
    for (const m of team) {
      const ref = existing.get(m.person_id)
      if (ref) batch.update(ref, encodeForFirestore({ role: m.role, is_lead: m.is_lead }))
      else {
        batch.set(
          doc(collection(db, 'project_members')),
          encodeForFirestore({ project_id: projectId, ...m, created_at: new Date().toISOString() }),
        )
      }
    }
    await batch.commit()
  })
}

export async function setItemDone(itemId: string, done: boolean): Promise<void> {
  await guard('Não foi possível atualizar o item. Tente de novo.', () =>
    updateDoc(doc(db, 'task_items', itemId), encodeForFirestore({ done })),
  )
}

export async function setTaskStatus(taskId: string, status: Task['status']): Promise<void> {
  await guard('Não foi possível atualizar a tarefa. Tente de novo.', () =>
    updateDoc(doc(db, 'tasks', taskId), encodeForFirestore({ status })),
  )
}

export async function setMemberAccess(person: Person, isMember: boolean): Promise<void> {
  if (!person.uid) {
    if (isMember) throw new Error('Informe o UID do login desta pessoa.')
    return
  }
  const ref = doc(db, 'members', person.uid)
  await guard('Não foi possível atualizar o acesso. Tente de novo.', () =>
    isMember ? setDoc(ref, encodeForFirestore({ person_id: person.id })) : deleteDoc(ref),
  )
}
