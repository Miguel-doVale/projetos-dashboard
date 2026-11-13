import { Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import LoginPage from '@/auth/LoginPage'
import NoAccessPage from '@/auth/NoAccessPage'
import { DataProvider, useData } from '@/data/DataProvider'
import { Button } from '@/components/ui/button'

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">{children}</main>
}

// Layout provisório: a Tarefa 5 substitui por shell e telas reais.
function Overview() {
  return (
    <main className="mx-auto max-w-app px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-label">LASETE // Projetos</p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground">Visão geral</h1>
    </main>
  )
}

function AppRoutes() {
  const { loading, error, reload } = useData()
  if (error) {
    return (
      <Centered>
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void reload()}>
          Tentar de novo
        </Button>
      </Centered>
    )
  }
  if (loading) {
    return (
      <Centered>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Carregando…</p>
      </Centered>
    )
  }
  return (
    <Routes>
      <Route index element={<Overview />} />
    </Routes>
  )
}

function Gate() {
  const { loading, email, access } = useAuth()
  if (loading) {
    return (
      <Centered>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Carregando…</p>
      </Centered>
    )
  }
  if (!email) return <LoginPage />
  if (access === 'none') return <NoAccessPage />
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
