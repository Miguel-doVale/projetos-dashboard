import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { SplitTitle } from '@/fx/SplitTitle'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/edit/ConfirmDelete'
import { PageForm } from '@/edit/PageForm'
import { Sections } from '@/blocks/Sections'
import { useData } from '@/data/DataProvider'

export default function CustomPage() {
  const { slug } = useParams()
  const { pages } = useData()
  const owner = useAuth().access === 'owner'
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const page = pages.find((p) => p.slug === slug)
  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-[650] text-foreground">Página não encontrada</h1>
        <Link to="/" className="text-sm text-accent underline-offset-4 hover:underline">
          Voltar para a visão geral
        </Link>
      </div>
    )
  }
  return (
    <div className="space-y-10">
      <SplitTitle className="text-4xl leading-[1.05] font-[650] tracking-tight text-foreground sm:text-5xl">
        {page.title}
      </SplitTitle>
      {owner && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Editar aba
          </Button>
          <ConfirmDelete table="pages" id={page.id} name={page.title} label="Excluir aba" onDeleted={() => navigate('/')} />
        </div>
      )}
      <Sections sections={page.blocks} />
      {editing && <PageForm page={page} onClose={() => setEditing(false)} />}
    </div>
  )
}
