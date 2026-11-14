import { beforeEach, describe, expect, it, vi } from 'vitest'
import { remove, runBatched, save, setItemDone, setMemberAccess, setProjectTeam, setTaskStatus } from '@/lib/api'
import { importSeed } from '@/data/importSeed'
import { seedData } from '@/data/seedData'
import type { Person } from '@/lib/types'
import * as fake from './helpers/fakeFirestore'
import { hasNestedArray } from './helpers/nested'

vi.mock('firebase/firestore', async () => await import('./helpers/fakeFirestore'))

beforeEach(() => {
  fake.reset()
  fake.seed('projects', 'p1', { title: 'Um' })
  fake.seed('projects', 'p2', { title: 'Dois' })
  fake.seed('tasks', 't1', { project_id: 'p1', assignee_id: 'a', sprint_id: 's1' })
  fake.seed('tasks', 't2', { project_id: 'p1', assignee_id: null, sprint_id: null })
  fake.seed('tasks', 't3', { project_id: 'p2', assignee_id: 'a', sprint_id: 's1' })
  fake.seed('task_items', 'i1', { task_id: 't1', done: false })
  fake.seed('task_items', 'i2', { task_id: 't2', done: false })
  fake.seed('task_items', 'i3', { task_id: 't3', done: false })
  fake.seed('project_members', 'm1', { project_id: 'p1', person_id: 'a', role: null, is_lead: true })
  fake.seed('project_members', 'm2', { project_id: 'p2', person_id: 'a', role: null, is_lead: false })
  fake.seed('project_members', 'm3', { project_id: 'p1', person_id: 'b', role: null, is_lead: false })
  fake.seed('people', 'a', { name: 'Ana', uid: 'ua' })
  fake.seed('people', 'b', { name: 'Beto', uid: null })
  fake.seed('members', 'ua', { person_id: 'a' })
  fake.seed('sprints', 's1', { name: 'Sprint 1' })
})

describe('remove', () => {
  it('projeto: apaga tarefas, itens e membros dele, e nada de outro projeto', async () => {
    await remove('projects', 'p1')
    expect(fake.ids('projects')).toEqual(['p2'])
    expect(fake.ids('tasks')).toEqual(['t3'])
    expect(fake.ids('task_items')).toEqual(['i3'])
    expect(fake.ids('project_members')).toEqual(['m2'])
  })

  it('tarefa: apaga os itens dela', async () => {
    await remove('tasks', 't1')
    expect(fake.ids('tasks')).toEqual(['t2', 't3'])
    expect(fake.ids('task_items')).toEqual(['i2', 'i3'])
  })

  it('pessoa: zera assignee_id, apaga project_members e members/{uid}', async () => {
    await remove('people', 'a')
    expect(fake.ids('people')).toEqual(['b'])
    expect(fake.read('tasks', 't1')?.assignee_id).toBeNull()
    expect(fake.read('tasks', 't3')?.assignee_id).toBeNull()
    expect(fake.ids('project_members')).toEqual(['m3'])
    expect(fake.ids('members')).toEqual([])
  })

  it('sprint: zera sprint_id nas tarefas', async () => {
    await remove('sprints', 's1')
    expect(fake.ids('sprints')).toEqual([])
    expect(fake.read('tasks', 't1')?.sprint_id).toBeNull()
    expect(fake.read('tasks', 't3')?.sprint_id).toBeNull()
    expect(fake.read('tasks', 't2')?.project_id).toBe('p1')
  })

  it('permission-denied vira a mensagem em português', async () => {
    fake.failReads.set('tasks', Object.assign(new Error('x'), { code: 'permission-denied' }))
    await expect(remove('projects', 'p1')).rejects.toThrow('Você não tem permissão para fazer isso.')
  })

  it('outros erros viram a mensagem genérica', async () => {
    fake.failReads.set('tasks', new Error('boom'))
    await expect(remove('projects', 'p1')).rejects.toThrow('Não foi possível excluir. Tente de novo.')
  })
})

describe('runBatched', () => {
  it('divide em lotes de no máximo 500 operações', async () => {
    const ops = Array.from({ length: 1201 }, (_, i) => ({
      type: 'delete' as const,
      ref: fake.doc({}, 'x', `d${i}`) as never,
    }))
    await runBatched(ops)
    expect(fake.commits).toEqual([500, 500, 201])
  })
})

describe('save', () => {
  it('cria com created_at e devolve a linha com id', async () => {
    const row = await save('sprints', { name: 'Sprint 2', starts_on: null, ends_on: null })
    expect(row.id).toBeTruthy()
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(fake.read('sprints', row.id)).toMatchObject({ name: 'Sprint 2' })
  })

  it('atualiza e devolve a linha completa', async () => {
    const row = await save('sprints', { id: 's1', name: 'Renomeada' })
    expect(row).toMatchObject({ id: 's1', name: 'Renomeada' })
    expect(fake.read('sprints', 's1')?.name).toBe('Renomeada')
  })
})

describe('save com tabela (sem array dentro de array)', () => {
  const sections = [
    { title: 'T', blocks: [{ type: 'table', headers: ['A', 'B'], rows: [['1', '2'], ['3', '4']] }] },
  ]

  it('cria um projeto com tabela e devolve o mesmo conteúdo', async () => {
    const row = await save('projects', { title: 'Com tabela', sections } as never)
    expect(hasNestedArray(fake.read('projects', row.id))).toBe(false)
    expect((row as { sections: unknown }).sections).toEqual(sections)
  })

  it('atualiza uma página com tabela', async () => {
    fake.seed('pages', 'pg', { slug: 'x', blocks: [] })
    const blocks = sections[0].blocks
    const row = await save('pages', { id: 'pg', blocks } as never)
    expect(hasNestedArray(fake.read('pages', 'pg'))).toBe(false)
    expect((row as { blocks: unknown }).blocks).toEqual(blocks)
  })

  it('o fake recusa array dentro de array', async () => {
    await expect(fake.setDoc(fake.doc({}, 'x', 'y') as never, { rows: [['a']] })).rejects.toThrow(
      'Nested arrays are not supported',
    )
  })
})

describe('setProjectTeam', () => {
  it('pessoa repetida lança', async () => {
    const dup = { role: null, is_lead: false }
    await expect(
      setProjectTeam('p1', [{ person_id: 'a', ...dup }, { person_id: 'a', ...dup }]),
    ).rejects.toThrow('Há pessoas repetidas na equipe.')
  })

  it('troca a equipe num único lote: atualiza, cria e remove', async () => {
    await setProjectTeam('p1', [
      { person_id: 'a', role: 'Dev', is_lead: false },
      { person_id: 'c', role: null, is_lead: true },
    ])
    expect(fake.commits).toEqual([3])
    expect(fake.read('project_members', 'm1')).toMatchObject({ role: 'Dev', is_lead: false })
    expect(fake.read('project_members', 'm3')).toBeUndefined()
    expect(fake.read('project_members', 'm2')).toBeDefined()
    const created = [...(fake.store.get('project_members') ?? [])].filter(([, d]) => d.person_id === 'c')
    expect(created).toHaveLength(1)
    expect(created[0][1]).toMatchObject({ project_id: 'p1', is_lead: true })
  })
})

describe('campos parciais e acesso', () => {
  it('setItemDone e setTaskStatus mexem só no campo', async () => {
    await setItemDone('i1', true)
    await setTaskStatus('t1', 'doing')
    expect(fake.read('task_items', 'i1')).toEqual({ task_id: 't1', done: true })
    expect(fake.read('tasks', 't1')).toMatchObject({ project_id: 'p1', status: 'doing' })
  })

  const person = (uid: string | null): Person => ({
    id: 'b', created_at: null, name: 'Beto', role: null, area: null, email: null, uid,
  })

  it('setMemberAccess sem uid lança ao conceder', async () => {
    await expect(setMemberAccess(person(null), true)).rejects.toThrow('Informe o UID do login desta pessoa.')
  })

  it('cria e apaga members/{uid}', async () => {
    await setMemberAccess(person('ub'), true)
    expect(fake.read('members', 'ub')).toEqual({ person_id: 'b' })
    await setMemberAccess(person('ub'), false)
    expect(fake.read('members', 'ub')).toBeUndefined()
  })
})

describe('importSeed', () => {
  it('recusa quando projects não está vazio', async () => {
    await expect(importSeed()).rejects.toThrow('O banco já tem conteúdo.')
    expect(fake.commits).toEqual([])
  })

  it('grava tudo resolvendo as referências para ids gerados', async () => {
    fake.store.clear()
    await importSeed()
    expect(fake.ids('people')).toHaveLength(5)
    expect(fake.ids('projects')).toHaveLength(6)
    expect(fake.ids('tasks')).toHaveLength(27)
    expect(fake.ids('pages')).toHaveLength(2)
    const projectIds = new Set(fake.ids('projects'))
    const personIds = new Set(fake.ids('people'))
    const members = [...(fake.store.get('project_members')?.values() ?? [])]
    expect(members).toHaveLength(seedData.members.length)
    expect(members.every((m) => projectIds.has(m.project_id as string) && personIds.has(m.person_id as string))).toBe(true)
    const tasks = [...(fake.store.get('tasks')?.values() ?? [])]
    expect(tasks.every((t) => projectIds.has(t.project_id as string) && t.created_at)).toBe(true)
  })

  it('nenhum documento gravado tem array dentro de array', async () => {
    fake.store.clear()
    await importSeed()
    for (const [col, docs] of fake.store) {
      for (const [id, data] of docs) expect(hasNestedArray(data), `${col}/${id}`).toBe(false)
    }
    const withTable = [...(fake.store.get('projects')?.values() ?? []), ...(fake.store.get('pages')?.values() ?? [])]
    expect(JSON.stringify(withTable)).toContain('__row')
  })
})
