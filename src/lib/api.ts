import { supabase } from '@/lib/supabase'
import type { Row, TableName, Task } from '@/lib/types'

type DbError = { message: string; code?: string }

function fail(error: DbError | null, fallback: string): void {
  if (!error) return
  if (error.code === '42501' || /row-level security|acesso negado|permission denied/i.test(error.message)) {
    throw new Error('Você não tem permissão para fazer isso.')
  }
  if (error.code === '23505') throw new Error('Já existe um registro com esses dados.')
  throw new Error(fallback)
}

export async function save<T extends TableName>(table: T, row: Partial<Row<T>>): Promise<Row<T>> {
  const { id, ...fields } = row as Partial<Row<T>> & { id?: string }
  const target = supabase.from(table)
  const query = id ? target.update(fields as never).eq('id', id) : target.insert(fields as never)
  const { data, error } = await query.select().single()
  fail(error, 'Não foi possível salvar. Tente de novo.')
  return data as Row<T>
}

export async function remove(table: TableName, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  fail(error, 'Não foi possível excluir. Tente de novo.')
}

export async function setProjectTeam(
  projectId: string,
  team: { person_id: string; role: string | null; is_lead: boolean }[],
): Promise<void> {
  const personIds = team.map((m) => m.person_id)
  if (new Set(personIds).size !== personIds.length) {
    throw new Error('Há pessoas repetidas na equipe.')
  }
  const failMsg = 'Não foi possível atualizar a equipe. Tente de novo.'

  if (team.length > 0) {
    const rows = team.map((m) => ({ project_id: projectId, ...m }))
    const { error } = await supabase
      .from('project_members')
      .upsert(rows, { onConflict: 'project_id,person_id' })
    fail(error, failMsg)
  }

  let del = supabase.from('project_members').delete().eq('project_id', projectId)
  if (personIds.length > 0) del = del.not('person_id', 'in', `(${personIds.join(',')})`)
  const { error } = await del
  fail(error, failMsg)
}

export async function setItemDone(itemId: string, done: boolean): Promise<void> {
  const { error } = await supabase.rpc('set_task_item_done', { item_id: itemId, is_done: done })
  fail(error, 'Não foi possível atualizar o item. Tente de novo.')
}

export async function setTaskStatus(taskId: string, status: Task['status']): Promise<void> {
  const { error } = await supabase.rpc('set_task_status', { task_id: taskId, new_status: status })
  fail(error, 'Não foi possível atualizar a tarefa. Tente de novo.')
}
