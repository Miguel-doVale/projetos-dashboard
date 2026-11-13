import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function NoAccessPage() {
  const { email, signOut } = useAuth()
  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <Card className="w-full max-w-sm gap-4 p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-label">LASETE // Projetos</p>
        <h1 className="text-xl font-semibold text-foreground">Sem acesso</h1>
        <p className="text-sm text-muted">
          O e-mail {email} não está cadastrado no dashboard. Peça a quem administra a diretoria para
          incluir você.
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Sair
        </Button>
      </Card>
    </main>
  )
}
