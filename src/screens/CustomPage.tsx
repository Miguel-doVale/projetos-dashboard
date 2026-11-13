import { Link, useParams } from 'react-router'
import { Sections } from '@/blocks/Sections'
import { useData } from '@/data/DataProvider'

export default function CustomPage() {
  const { slug } = useParams()
  const { pages } = useData()
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
      <h1 data-reveal className="text-4xl leading-[1.05] font-[650] tracking-tight text-foreground sm:text-5xl">
        {page.title}
      </h1>
      <Sections sections={page.blocks} />
    </div>
  )
}
