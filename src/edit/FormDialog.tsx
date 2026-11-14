import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FormError } from '@/edit/fields'
import { errorMessage } from '@/edit/util'

interface Props {
  title: string
  description?: string
  submitLabel?: string
  /** Lança `Error` para mostrar a mensagem no formulário e mantê-lo aberto. */
  onSubmit: () => Promise<void>
  onClose: () => void
  children: ReactNode
}

/** Diálogo de formulário: envio, estado "Salvando…" e erro no próprio formulário. */
export function FormDialog({ title, description, submitLabel = 'Salvar', onSubmit, onClose, children }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const observer = useRef<MutationObserver | null>(null)

  // Mexer em campo (input/change) ou em linhas da lista (adicionar/remover) conta como alteração.
  // O formulário vive no Portal do Radix e só existe depois do primeiro efeito, então o
  // observador se liga por callback ref, quando o nó aparece de fato.
  const formRef = useCallback((form: HTMLFormElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!form) return
    observer.current = new MutationObserver((records) => {
      // A mensagem de erro e o texto do botão ("Salvando…") são do próprio formulário, não do usuário.
      const own = (n: Node) => n instanceof Element && (n.matches('[role="alert"]') || n.closest('[role="alert"], button') !== null)
      const ownText = (r: MutationRecord) => r.target instanceof Element && r.target.closest('[role="alert"], button') !== null
      const user = records.some((r) => !ownText(r) && ![...r.addedNodes, ...r.removedNodes].every(own))
      if (user) setChanged(true)
    })
    observer.current.observe(form, { childList: true, subtree: true })
  }, [])
  useEffect(() => () => observer.current?.disconnect(), [])

  function requestClose() {
    if (saving) return
    if (changed) setConfirming(true)
    else onClose()
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSubmit()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent
        className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-[650]">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        <form
          ref={formRef}
          onSubmit={(e) => void submit(e)}
          onInput={() => setChanged(true)}
          onChange={() => setChanged(true)}
          noValidate
          className="grid gap-4"
        >
          {children}
          <FormError message={error} />
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={requestClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Descartar as alterações?</DialogTitle>
          <DialogDescription>O que você digitou será perdido.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Continuar editando
          </Button>
          <Button type="button" variant="destructive" onClick={onClose}>
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
