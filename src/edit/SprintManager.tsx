import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useData } from '@/data/DataProvider'
import { ConfirmDelete } from '@/edit/ConfirmDelete'
import { Field, FormError } from '@/edit/fields'
import { errorMessage, orNull } from '@/edit/util'
import { save } from '@/lib/api'
import type { Sprint } from '@/lib/types'

export function SprintManager({ onClose }: { onClose: () => void }) {
  const { sprints, reload } = useData()
  const [editing, setEditing] = useState<Sprint | null>(null)
  const [name, setName] = useState('')
  const [starts, setStarts] = useState('')
  const [ends, setEnds] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function fill(s: Sprint | null) {
    setEditing(s)
    setName(s?.name ?? '')
    setStarts(s?.starts_on ?? '')
    setEnds(s?.ends_on ?? '')
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Informe o nome.')
    if (starts && ends && ends < starts) return setError('A data final vem antes da inicial.')
    setBusy(true)
    try {
      await save('sprints', {
        ...(editing ? { id: editing.id } : {}),
        name: name.trim(),
        starts_on: orNull(starts),
        ends_on: orNull(ends),
      })
      await reload()
      fill(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-[650]">Sprints</DialogTitle>
          <DialogDescription>Crie, edite ou apague sprints. Tarefas de uma sprint apagada ficam sem sprint.</DialogDescription>
        </DialogHeader>
        {sprints.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma sprint ainda.</p>
        ) : (
          <ul className="grid gap-2">
            {sprints.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <span className="min-w-0 text-sm">
                  {s.name}
                  {(s.starts_on || s.ends_on) && (
                    <span className="ml-2 font-mono text-xs text-muted">
                      {s.starts_on ?? '…'} → {s.ends_on ?? '…'}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 gap-1.5">
                  <Button type="button" variant="outline" size="sm" aria-label={`Editar sprint ${s.name}`} onClick={() => fill(s)}>
                    Editar
                  </Button>
                  <ConfirmDelete
                    table="sprints"
                    id={s.id}
                    name={s.name}
                    consequence="As tarefas dela ficam sem sprint."
                    onDeleted={() => editing?.id === s.id && fill(null)}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-3 border-t border-border pt-4">
          <h3 className="font-mono text-[11px] tracking-wider text-label uppercase">{editing ? `Editar ${editing.name}` : 'Nova sprint'}</h3>
          <Field label="Nome da sprint">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Início">
              <Input type="date" value={starts} onChange={(e) => setStarts(e.target.value)} />
            </Field>
            <Field label="Fim">
              <Input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} />
            </Field>
          </div>
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            {editing && (
              <Button type="button" variant="ghost" onClick={() => fill(null)}>
                Cancelar edição
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : editing ? 'Salvar sprint' : 'Criar sprint'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
