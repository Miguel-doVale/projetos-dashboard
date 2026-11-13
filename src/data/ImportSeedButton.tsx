import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthProvider'
import { importSeed } from '@/data/importSeed'
import { useData } from '@/data/DataProvider'

/** Só para o dono e só com o banco vazio: carrega o conteúdo inicial do levantamento. */
export function ImportSeedButton() {
  const { access } = useAuth()
  const { projects, reload } = useData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (access !== 'owner' || projects.length > 0) return null

  async function run() {
    setBusy(true)
    setError(null)
    try {
      await importSeed()
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível importar o conteúdo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-10 rounded-xl border border-border bg-surface-raised px-4 py-4">
      <p className="text-sm text-foreground">O banco está vazio. Importe o conteúdo do levantamento inicial.</p>
      <Button className="mt-3" disabled={busy} onClick={() => void run()}>
        {busy ? 'Importando…' : 'Importar conteúdo inicial'}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
