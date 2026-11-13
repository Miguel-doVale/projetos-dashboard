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
import TasksPlaceholder from '@/screens/TasksPlaceholder'

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">{children}</main>
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
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="projetos" element={<Projects />} />
        <Route path="projetos/:id" element={<ProjectPage />} />
        <Route path="tarefas" element={<TasksPlaceholder />} />
        <Route path="pessoas" element={<People />} />
        <Route path="p/:slug" element={<CustomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
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
