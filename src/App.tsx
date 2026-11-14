import { Navigate, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import LoginPage from '@/auth/LoginPage'
import NoAccessPage from '@/auth/NoAccessPage'
import { DataProvider, useData } from '@/data/DataProvider'
import { Button } from '@/components/ui/button'
import { Layout } from '@/shell/Layout'
import CustomPage from '@/screens/CustomPage'
import Overview from '@/screens/Overview'
import People from '@/screens/People'
import ProjectPage from '@/screens/ProjectPage'
import Projects from '@/screens/Projects'
import Tasks from '@/screens/Tasks'

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">{children}</main>
}

function ReloadBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mb-8 flex flex-wrap items-center justify-center gap-3 rounded-lg bg-surface-raised px-4 py-2 text-sm text-destructive">
      <span>{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  )
}

function AppRoutes() {
  const { loading, error, loaded, reload } = useData()
  // Tela cheia de erro só quando nada carregou ainda; depois disso, só um aviso.
  if (error && !loaded) {
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
        <Route element={<Layout banner={error ? <ReloadBanner message={error} onRetry={() => void reload()} /> : null} />}>
          <Route index element={<Overview />} />
          <Route path="projetos" element={<Projects />} />
          <Route path="projetos/:id" element={<ProjectPage />} />
          <Route path="tarefas" element={<Tasks />} />
          <Route path="pessoas" element={<People />} />
          <Route path="p/:slug" element={<CustomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    </Routes>
  )
}

function Gate() {
  const { loading, email, access, accessError, retryAccess, signOut } = useAuth()
  if (loading) {
    return (
      <Centered>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Carregando…</p>
      </Centered>
    )
  }
  if (!email) return <LoginPage />
  if (accessError) {
    return (
      <Centered>
        <p role="alert" className="text-sm text-destructive">Não foi possível verificar seu acesso.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={retryAccess}>
            Tentar de novo
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </Centered>
    )
  }
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
