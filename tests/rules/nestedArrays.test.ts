import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { decodeFromFirestore, encodeForFirestore } from '../../src/lib/firestoreCodec'
import { seedData } from '../../src/data/seedData'

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

const owner = () => env.authenticatedContext('owner-uid').firestore()

describe('arrays aninhados no Firestore real (emulador)', () => {
  it('projetos do conteúdo inicial: grava codificado e lê de volta igual', async () => {
    const db = owner()
    for (const p of seedData.projects) {
      const ref = doc(db, 'projects', `p-${p.number}`)
      await assertSucceeds(setDoc(ref, encodeForFirestore(p)))
      const back = decodeFromFirestore((await getDoc(ref)).data()) as typeof p
      expect(back.sections).toEqual(p.sections)
    }
  })

  it('páginas do conteúdo inicial: grava codificado e lê de volta igual', async () => {
    const db = owner()
    for (const page of seedData.pages) {
      const ref = doc(db, 'pages', page.slug)
      await assertSucceeds(setDoc(ref, encodeForFirestore(page)))
      const back = decodeFromFirestore((await getDoc(ref)).data()) as typeof page
      expect(back.blocks).toEqual(page.blocks)
    }
  })

  it('sem codificar, o Firestore recusa (o teste pegaria o bug)', async () => {
    const all = [
      ...seedData.projects.map((p) => ({ col: 'projects', id: `x-${p.number}`, data: p, has: JSON.stringify(p.sections).includes('"rows"') })),
      ...seedData.pages.map((p) => ({ col: 'pages', id: `x-${p.slug}`, data: p, has: JSON.stringify(p.blocks).includes('"rows"') })),
    ]
    const withTable = all.filter((d) => d.has)
    expect(withTable.length).toBeGreaterThan(0)
    for (const d of withTable) {
      // O SDK recusa na hora (síncrono) ou, em outras versões, na promessa.
      await expect(async () => setDoc(doc(owner(), d.col, d.id), d.data)).rejects.toThrow(/Nested arrays are not supported/)
    }
  })
})
