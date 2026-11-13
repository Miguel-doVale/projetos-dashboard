// Firestore em memória para os testes (usado como mock de 'firebase/firestore').
type Data = Record<string, unknown>
type ColRef = { kind: 'col'; col: string }
type DocRef = { kind: 'doc'; col: string; id: string; path: string }
type Constraint = { f: string; op: string; v: unknown } | { limit: number }
type Query = { kind: 'query'; col: string; constraints: Constraint[] }

export const store = new Map<string, Map<string, Data>>()
/** Coleções lidas com getDocs/getDoc, na ordem. */
export const reads: string[] = []
/** Erros a lançar em getDocs/getDoc por coleção. */
export const failReads = new Map<string, unknown>()
/** Cada leitura de `projects` espera a próxima promessa daqui (depois de já ter lido os dados). */
export const holds: Promise<void>[] = []
/** Lotes confirmados, com o número de operações de cada um. */
export const commits: number[] = []

export function reset() {
  store.clear()
  reads.length = 0
  failReads.clear()
  holds.length = 0
  commits.length = 0
  nextId = 1
}

export function seed(col: string, id: string, data: Data) {
  if (!store.has(col)) store.set(col, new Map())
  store.get(col)!.set(id, data)
}
export const read = (col: string, id: string) => store.get(col)?.get(id)
export const ids = (col: string) => [...(store.get(col)?.keys() ?? [])].sort()

let nextId = 1
const newId = () => `auto${nextId++}`

export const getFirestore = () => ({})
export const collection = (_db: unknown, col: string): ColRef => ({ kind: 'col', col })
export function doc(a: unknown, col?: string, id?: string): DocRef {
  const c = (a as ColRef).kind === 'col' ? (a as ColRef).col : col!
  const i = (a as ColRef).kind === 'col' ? newId() : id!
  return { kind: 'doc', col: c, id: i, path: `${c}/${i}` }
}
export const where = (f: string, op: string, v: unknown): Constraint => ({ f, op, v })
export const limit = (n: number): Constraint => ({ limit: n })
export const query = (c: ColRef, ...constraints: Constraint[]): Query => ({ kind: 'query', col: c.col, constraints })

function snapOf(col: string, id: string, data: Data | undefined) {
  return { id, ref: { kind: 'doc', col, id, path: `${col}/${id}` } as DocRef, exists: () => data !== undefined, data: () => data }
}

function guardRead(col: string) {
  reads.push(col)
  if (failReads.has(col)) throw failReads.get(col)
}

export async function getDocs(q: ColRef | Query) {
  guardRead(q.col)
  const constraints = q.kind === 'query' ? q.constraints : []
  let rows = [...(store.get(q.col) ?? new Map<string, Data>()).entries()]
  for (const c of constraints) {
    if ('f' in c) {
      rows = rows.filter(([, d]) => (c.op === 'in' ? (c.v as unknown[]).includes(d[c.f]) : d[c.f] === c.v))
    } else rows = rows.slice(0, c.limit)
  }
  const docs = rows.map(([id, d]) => snapOf(q.col, id, d))
  if (q.col === 'projects' && holds.length > 0) await holds.shift()
  return { docs, empty: docs.length === 0, size: docs.length }
}

export async function getDoc(ref: DocRef) {
  guardRead(ref.col)
  return snapOf(ref.col, ref.id, read(ref.col, ref.id))
}

export async function addDoc(c: ColRef, data: Data) {
  const id = newId()
  seed(c.col, id, { ...data })
  return { id }
}
export async function setDoc(ref: DocRef, data: Data) {
  seed(ref.col, ref.id, { ...data })
}
export async function updateDoc(ref: DocRef, data: Data) {
  const cur = read(ref.col, ref.id)
  if (!cur) throw Object.assign(new Error('not-found'), { code: 'not-found' })
  seed(ref.col, ref.id, { ...cur, ...data })
}
export async function deleteDoc(ref: DocRef) {
  store.get(ref.col)?.delete(ref.id)
}

export function writeBatch() {
  const ops: (() => void)[] = []
  return {
    set: (ref: DocRef, data: Data) => void ops.push(() => seed(ref.col, ref.id, { ...data })),
    update: (ref: DocRef, data: Data) =>
      void ops.push(() => seed(ref.col, ref.id, { ...(read(ref.col, ref.id) ?? {}), ...data })),
    delete: (ref: DocRef) => void ops.push(() => void store.get(ref.col)?.delete(ref.id)),
    commit: async () => {
      commits.push(ops.length)
      ops.forEach((run) => run())
    },
  }
}
