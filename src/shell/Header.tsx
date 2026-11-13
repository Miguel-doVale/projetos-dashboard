import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { PageForm } from '@/edit/PageForm'
import { useAuth } from '@/auth/AuthProvider'
import { useData } from '@/data/DataProvider'
import { Button } from '@/components/ui/button'

const BASE_LINKS = [
  { to: '/', label: 'Visão geral', end: true },
  { to: '/projetos', label: 'Projetos', end: false },
  { to: '/tarefas', label: 'Tarefas', end: false },
  { to: '/pessoas', label: 'Pessoas', end: false },
]

export function Header() {
  const { email, access, signOut } = useAuth()
  const navigate = useNavigate()
  const [newPage, setNewPage] = useState(false)
  const { pages } = useData()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [...BASE_LINKS, ...pages.map((p) => ({ to: `/p/${p.slug}`, label: p.title, end: false }))]

  return (
    <header
      data-scrolled={scrolled}
      className="fixed inset-x-0 top-0 z-40 h-[72px] border-b border-transparent bg-black transition-colors data-[scrolled=true]:border-border"
    >
      <div className="mx-auto grid h-full max-w-app grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link to="/" className="font-mono text-xs tracking-widest whitespace-nowrap text-foreground uppercase">
          LASETE <span className="text-muted">{'//'}</span> Projetos
        </Link>
        <nav aria-label="Principal" className="flex min-w-0 justify-center">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[#222] bg-[#080808] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className="rounded-lg px-3.5 py-1.5 text-sm whitespace-nowrap text-muted transition-colors hover:text-foreground aria-[current=page]:bg-[#242424] aria-[current=page]:text-foreground"
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="flex items-center gap-3">
          {email && <span className="hidden font-mono text-xs text-muted lg:inline">{email}</span>}
          {access === 'owner' && (
            <Button variant="outline" size="sm" onClick={() => setNewPage(true)}>
              Nova aba
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sair
          </Button>
        </div>
      </div>
      {newPage && <PageForm onClose={() => setNewPage(false)} onSaved={(slug) => navigate(`/p/${slug}`)} />}
    </header>
  )
}
