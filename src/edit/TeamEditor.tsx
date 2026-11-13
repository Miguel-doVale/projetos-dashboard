import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Field, NativeSelect } from '@/edit/fields'
import type { Person } from '@/lib/types'

export interface TeamRow {
  person_id: string
  role: string
  is_lead: boolean
}

interface Props {
  people: Person[]
  value: TeamRow[]
  onChange: (next: TeamRow[]) => void
}

export function TeamEditor({ people, value, onChange }: Props) {
  const patch = (i: number, p: Partial<TeamRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)))
  // Só uma frente por projeto: marcar uma desmarca a anterior.
  const setLead = (i: number, lead: boolean) =>
    onChange(value.map((r, j) => ({ ...r, is_lead: j === i ? lead : lead ? false : r.is_lead })))

  return (
    <div className="grid gap-2">
      {value.map((row, i) => {
        const taken = new Set(value.filter((_, j) => j !== i).map((r) => r.person_id))
        return (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-2.5">
            <Field label={`Pessoa ${i + 1}`} className="min-w-44 flex-1">
              <NativeSelect value={row.person_id} onChange={(e) => patch(i, { person_id: e.target.value })}>
                <option value="">Escolha…</option>
                {people
                  .filter((p) => !taken.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Field label={`Papel ${i + 1}`} className="min-w-36 flex-1">
              <Input value={row.role} onChange={(e) => patch(i, { role: e.target.value })} />
            </Field>
            <label className="flex h-8 items-center gap-2 text-sm">
              <Checkbox aria-label={`Frente ${i + 1}`} checked={row.is_lead} onCheckedChange={(c) => setLead(i, c === true)} />
              Frente
            </label>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover pessoa ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              Remover
            </Button>
          </div>
        )
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={value.length >= people.length}
          onClick={() => onChange([...value, { person_id: '', role: '', is_lead: false }])}
        >
          Adicionar pessoa
        </Button>
      </div>
    </div>
  )
}
