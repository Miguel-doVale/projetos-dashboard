import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useData } from '@/data/DataProvider'
import { downloadText, printHtml } from './download'
import { fontDataUrl } from './font'
import { toHtml } from './html'
import { toMarkdown } from './markdown'
import { buildExport, fileName } from './model'

/** Sem `projectId` exporta todos os projetos; com ele, só aquele. */
export function ExportMenu({ projectId }: { projectId?: string }) {
  const data = useData()
  const make = () => buildExport(data, projectId, new Date().toISOString())
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            const doc = make()
            downloadText(fileName(doc, 'html'), 'text/html;charset=utf-8', toHtml(doc, { theme: 'dark', fontDataUrl }))
          }}
        >
          Baixar .html
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => printHtml(toHtml(make(), { theme: 'print', fontDataUrl }))}>
          Salvar .pdf
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            const doc = make()
            downloadText(fileName(doc, 'md'), 'text/markdown;charset=utf-8', toMarkdown(doc))
          }}
        >
          Baixar .md
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
