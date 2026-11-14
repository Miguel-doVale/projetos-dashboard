import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const COLLECTIONS = ['people', 'projects', 'project_members', 'sprints', 'tasks', 'task_items', 'pages'] as const
const OWNER_WRITE_ONLY = ['people', 'projects', 'project_members', 'sprints', 'pages'] as const

const rules = readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf-8').replaceAll(
  'OWNER_UID_PLACEHOLDER',
  'owner-uid',
)

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-projetos-dashboard',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'members/member-uid'), { person_id: 'p1' })
    await setDoc(doc(db, 'admins/admin-uid'), { person_id: 'p2' })
    await setDoc(doc(db, 'people/p2'), { name: 'Bia', uid: 'admin-uid' })
    await setDoc(doc(db, 'people/p3'), { name: 'Caio', uid: null })
    await setDoc(doc(db, 'people/p1'), { name: 'Ana', uid: 'member-uid' })
    await setDoc(doc(db, 'projects/pr1'), { title: 'Projeto' })
    await setDoc(doc(db, 'project_members/pm1'), { project_id: 'pr1', person_id: 'p1' })
    await setDoc(doc(db, 'sprints/s1'), { name: 'Sprint 1' })
    await setDoc(doc(db, 'tasks/t1'), { title: 'Tarefa', status: 'todo' })
    await setDoc(doc(db, 'task_items/i1'), { task_id: 't1', text: 'Item', done: false })
    await setDoc(doc(db, 'pages/pg1'), { slug: 'plano' })
  })
})

const owner = () => env.authenticatedContext('owner-uid').firestore()
const admin = () => env.authenticatedContext('admin-uid').firestore()
const member = () => env.authenticatedContext('member-uid').firestore()
const stranger = () => env.authenticatedContext('stranger-uid').firestore()
const anon = () => env.unauthenticatedContext().firestore()

const FIXTURE_ID: Record<string, string> = {
  people: 'p1',
  projects: 'pr1',
  project_members: 'pm1',
  sprints: 's1',
  tasks: 't1',
  task_items: 'i1',
  pages: 'pg1',
}

describe('dono', () => {
  for (const name of [...COLLECTIONS, 'members'] as const) {
    it(`lê, cria, atualiza e apaga em ${name}`, async () => {
      const db = owner()
      const id = name === 'members' ? 'member-uid' : FIXTURE_ID[name]
      await assertSucceeds(getDoc(doc(db, name, id)))
      await assertSucceeds(getDocs(collection(db, name)))
      await assertSucceeds(setDoc(doc(db, name, 'novo'), { x: 1 }))
      await assertSucceeds(updateDoc(doc(db, name, id), { x: 2 }))
      await assertSucceeds(deleteDoc(doc(db, name, id)))
    })
  }
})

describe('administrador', () => {
  for (const name of [...COLLECTIONS, 'members'] as const) {
    it(`lê, cria, atualiza e apaga em ${name}`, async () => {
      const db = admin()
      const id = name === 'members' ? 'member-uid' : FIXTURE_ID[name]
      await assertSucceeds(getDoc(doc(db, name, id)))
      await assertSucceeds(getDocs(collection(db, name)))
      await assertSucceeds(setDoc(doc(db, name, 'novo'), { x: 1 }))
      await assertSucceeds(updateDoc(doc(db, name, id), { x: 2 }))
      await assertSucceeds(deleteDoc(doc(db, name, id)))
    })
  }

  it('cria e apaga tarefas e itens, e atualiza o title da tarefa', async () => {
    const db = admin()
    await assertSucceeds(setDoc(doc(db, 'tasks/novo'), { title: 'N', status: 'todo' }))
    await assertSucceeds(setDoc(doc(db, 'task_items/novo'), { task_id: 't1', done: false }))
    await assertSucceeds(updateDoc(doc(db, 'tasks/t1'), { title: 'Outro' }))
    await assertSucceeds(deleteDoc(doc(db, 'tasks/t1')))
    await assertSucceeds(deleteDoc(doc(db, 'task_items/i1')))
  })

  it('cria e apaga admins/x, lista admins e lê o próprio', async () => {
    const db = admin()
    await assertSucceeds(setDoc(doc(db, 'admins/x'), { person_id: 'p3' }))
    await assertSucceeds(getDocs(collection(db, 'admins')))
    await assertSucceeds(getDoc(doc(db, 'admins/admin-uid')))
    await assertSucceeds(deleteDoc(doc(db, 'admins/x')))
  })

  it('apaga uma pessoa que é admin e uma pessoa comum', async () => {
    await assertSucceeds(deleteDoc(doc(admin(), 'people/p2')))
    await assertSucceeds(deleteDoc(doc(admin(), 'people/p3')))
  })
})

describe('dono raiz e admins', () => {
  it('cria e apaga admins/x, lista admins e apaga pessoa admin', async () => {
    const db = owner()
    await assertSucceeds(setDoc(doc(db, 'admins/x'), { person_id: 'p3' }))
    await assertSucceeds(getDocs(collection(db, 'admins')))
    await assertSucceeds(deleteDoc(doc(db, 'admins/x')))
    await assertSucceeds(deleteDoc(doc(db, 'people/p2')))
  })
})

describe('admins: membro, estranho e sem login', () => {
  for (const [label, db] of [['membro', member], ['logado sem ser membro', stranger], ['sem login', anon]] as const) {
    it(`${label} não lê nem escreve em admins`, async () => {
      await assertFails(getDoc(doc(db(), 'admins/admin-uid')))
      await assertFails(getDocs(collection(db(), 'admins')))
      await assertFails(setDoc(doc(db(), 'admins/x'), { person_id: 'p1' }))
      await assertFails(updateDoc(doc(db(), 'admins/admin-uid'), { x: 1 }))
      await assertFails(deleteDoc(doc(db(), 'admins/admin-uid')))
    })
  }
})

describe('membro', () => {
  for (const name of COLLECTIONS) {
    it(`lê ${name}`, async () => {
      await assertSucceeds(getDoc(doc(member(), name, FIXTURE_ID[name])))
      await assertSucceeds(getDocs(collection(member(), name)))
    })
  }

  for (const name of OWNER_WRITE_ONLY) {
    it(`não cria, atualiza nem apaga em ${name}`, async () => {
      const db = member()
      await assertFails(setDoc(doc(db, name, 'novo'), { x: 1 }))
      await assertFails(updateDoc(doc(db, name, FIXTURE_ID[name]), { x: 2 }))
      await assertFails(deleteDoc(doc(db, name, FIXTURE_ID[name])))
    })
  }

  for (const name of ['tasks', 'task_items'] as const) {
    it(`não cria nem apaga em ${name}`, async () => {
      await assertFails(setDoc(doc(member(), name, 'novo'), { x: 1 }))
      await assertFails(deleteDoc(doc(member(), name, FIXTURE_ID[name])))
    })
  }

  it('atualiza tasks só com status válido', async () => {
    await assertSucceeds(updateDoc(doc(member(), 'tasks/t1'), { status: 'doing' }))
  })
  it('não atualiza tasks com status inválido', async () => {
    await assertFails(updateDoc(doc(member(), 'tasks/t1'), { status: 'qualquer' }))
  })
  it('não atualiza tasks com title, nem com status e title juntos', async () => {
    await assertFails(updateDoc(doc(member(), 'tasks/t1'), { title: 'Outro' }))
    await assertFails(updateDoc(doc(member(), 'tasks/t1'), { status: 'doing', title: 'Outro' }))
  })

  it('atualiza task_items só com done booleano', async () => {
    await assertSucceeds(updateDoc(doc(member(), 'task_items/i1'), { done: true }))
  })
  it('não atualiza task_items com done não booleano, com text, nem com ambos', async () => {
    await assertFails(updateDoc(doc(member(), 'task_items/i1'), { done: 'sim' }))
    await assertFails(updateDoc(doc(member(), 'task_items/i1'), { text: 'Outro' }))
    await assertFails(updateDoc(doc(member(), 'task_items/i1'), { done: true, text: 'Outro' }))
  })

  it('lê o próprio members/member-uid', async () => {
    await assertSucceeds(getDoc(doc(member(), 'members/member-uid')))
  })
  it('não lê members/outro-uid, não lista members, não cria members/x', async () => {
    await assertFails(getDoc(doc(member(), 'members/outro-uid')))
    await assertFails(getDocs(collection(member(), 'members')))
    await assertFails(setDoc(doc(member(), 'members/x'), { person_id: 'p1' }))
  })
})

describe('logado sem ser membro', () => {
  for (const name of COLLECTIONS) {
    it(`não lê ${name}`, async () => {
      await assertFails(getDoc(doc(stranger(), name, FIXTURE_ID[name])))
      await assertFails(getDocs(collection(stranger(), name)))
    })
  }
  it('não atualiza status nem cria members/stranger-uid', async () => {
    await assertFails(updateDoc(doc(stranger(), 'tasks/t1'), { status: 'doing' }))
    await assertFails(updateDoc(doc(stranger(), 'task_items/i1'), { done: true }))
    await assertFails(setDoc(doc(stranger(), 'members/stranger-uid'), { person_id: 'p1' }))
  })
  it('lendo o próprio members/stranger-uid inexistente recebe sucesso (documento ausente)', async () => {
    await assertSucceeds(getDoc(doc(stranger(), 'members/stranger-uid')))
  })
})

describe('sem login', () => {
  for (const name of [...COLLECTIONS, 'members'] as const) {
    it(`não lê ${name}`, async () => {
      await assertFails(getDoc(doc(anon(), name, FIXTURE_ID[name] ?? 'member-uid')))
      await assertFails(getDocs(collection(anon(), name)))
    })
  }
})

describe('coleção fora do contrato', () => {
  for (const [label, db] of [
    ['dono', owner],
    ['membro', member],
    ['logado sem ser membro', stranger],
    ['sem login', anon],
  ] as const) {
    it(`${label} não lê nem escreve em outra/x`, async () => {
      await assertFails(getDoc(doc(db(), 'outra/x')))
      await assertFails(setDoc(doc(db(), 'outra/x'), { x: 1 }))
    })
  }
})
