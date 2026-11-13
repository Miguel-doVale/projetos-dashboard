import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useData } from '@/data/DataProvider'
import { Field } from '@/edit/fields'
import { FormDialog } from '@/edit/FormDialog'
import { orNull } from '@/edit/util'
import { save, setMemberAccess } from '@/lib/api'
import type { Person } from '@/lib/types'

interface Props {
  /** Ausente: cria uma pessoa nova. */
  person?: Person
  onClose: () => void
}

export function PersonForm({ person, onClose }: Props) {
  const { memberUids, reload } = useData()
  const wasMember = !!person?.uid && memberUids.includes(person.uid)
  const [name, setName] = useState(person?.name ?? '')
  const [role, setRole] = useState(person?.role ?? '')
  const [area, setArea] = useState(person?.area ?? '')
  const [email, setEmail] = useState(person?.email ?? '')
  const [uid, setUid] = useState(person?.uid ?? '')
  const [member, setMember] = useState(wasMember)

  async function submit() {
    if (!name.trim()) throw new Error('Informe o nome.')
    const nextUid = orNull(uid)
    if (member && !nextUid) throw new Error('Informe o UID do login desta pessoa.')

    const fields = {
      name: name.trim(),
      role: orNull(role),
      area: orNull(area),
      email: orNull(email),
      uid: nextUid,
    }
    const saved = await save('people', person ? { id: person.id, ...fields } : fields)
    const target: Person = { created_at: person?.created_at ?? null, ...fields, id: person?.id ?? saved.id }
    const changed = member !== wasMember || nextUid !== (person?.uid ?? null)
    if (changed) {
      // O UID mudou: o acesso do UID antigo é retirado antes de conceder o novo.
      if (wasMember && person?.uid && person.uid !== nextUid) await setMemberAccess(person, false)
      await setMemberAccess(target, member)
    }
    await reload()
  }

  return (
    <FormDialog title={person ? 'Editar pessoa' : 'Nova pessoa'} onSubmit={submit} onClose={onClose}>
      <Field label="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cargo">
          <Input value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="Diretoria">
          <Input value={area} onChange={(e) => setArea(e.target.value)} />
        </Field>
      </div>
      <Field label="E-mail" hint="Só informativo; não é usado para entrar.">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="UID do login" hint="Crie o usuário em Authentication no console do Firebase e cole aqui o UID dele.">
        <Input value={uid} onChange={(e) => setUid(e.target.value)} className="font-mono" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={member} onCheckedChange={(c) => setMember(c === true)} />
        Pode entrar no dashboard (membro)
      </label>
    </FormDialog>
  )
}
