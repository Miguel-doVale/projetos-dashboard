import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { useData } from '@/data/DataProvider'
import { Field } from '@/edit/fields'
import { FormDialog } from '@/edit/FormDialog'
import { fromDrafts, SectionsEditor, toDrafts } from '@/edit/SectionsEditor'
import { nextPosition, slugify } from '@/edit/util'
import { save } from '@/lib/api'
import type { Page } from '@/lib/types'

interface Props {
  page?: Page
  onClose: () => void
  /** Chamado com o slug da aba salva. */
  onSaved?: (slug: string) => void
}

export function PageForm({ page, onClose, onSaved }: Props) {
  const { pages, reload } = useData()
  const [title, setTitle] = useState(page?.title ?? '')
  const [sections, setSections] = useState(() => toDrafts(page?.blocks ?? []))

  async function submit() {
    if (!title.trim()) throw new Error('Informe o título.')
    // O endereço da aba nasce do título e não muda ao editar.
    const slug = page?.slug ?? slugify(title)
    if (!slug) throw new Error('O título precisa ter letras ou números.')
    if (pages.some((p) => p.slug === slug && p.id !== page?.id)) {
      throw new Error('Já existe uma aba com este endereço. Use outro título.')
    }
    await save('pages', {
      ...(page ? { id: page.id } : { position: nextPosition(pages), slug }),
      title: title.trim(),
      blocks: fromDrafts(sections),
    })
    await reload()
    onSaved?.(slug)
  }

  return (
    <FormDialog title={page ? 'Editar aba' : 'Nova aba'} onSubmit={submit} onClose={onClose}>
      <Field label="Título" hint={page ? `Endereço: /p/${page.slug}` : 'O endereço da aba é gerado a partir do título.'}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <SectionsEditor value={sections} onChange={setSections} />
    </FormDialog>
  )
}
