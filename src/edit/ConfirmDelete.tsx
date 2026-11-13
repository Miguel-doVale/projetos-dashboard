import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useData } from '@/data/DataProvider'
import { FormError } from '@/edit/fields'
import { errorMessage } from '@/edit/util'
import { remove } from '@/lib/api'
import type { TableName } from '@/lib/types'

interface Props {
  table: TableName
  id: string
  /** Nome do que será apagado, citado na confirmação. */
  name: string
  /** O que vai junto, em uma frase. */
  consequence?: string
  label?: string
  onDeleted?: () => void
}

/** Botão "Excluir" com confirmação; em erro, a confirmação continua aberta. */
export function ConfirmDelete({ table, id, name, consequence, label = 'Excluir', onDeleted }: Props) {
  const { reload } = useData()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await remove(table, id)
      await reload()
      setOpen(false)
      onDeleted?.()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir “{name}”?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. {consequence}
            </DialogDescription>
          </DialogHeader>
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void confirm()}>
              {busy ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
