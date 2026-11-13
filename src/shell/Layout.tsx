import { Outlet } from 'react-router'
import { Header } from '@/shell/Header'

export function Layout() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-app px-4 pt-[72px] pb-24 sm:px-6">
        <div className="pt-12">
          <Outlet />
        </div>
      </main>
    </>
  )
}
