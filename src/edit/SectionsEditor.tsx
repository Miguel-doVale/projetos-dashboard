import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, NativeSelect } from '@/edit/fields'
import { BLOCK_TYPE_HINT, BLOCK_TYPE_LABEL, blockToText, textToBlock } from '@/edit/sectionsText'
import type { LeafBlock, Section } from '@/lib/types'

type BlockType = LeafBlock['type']

/** Rascunho de um bloco: o texto cru fica à parte para não perder linhas em branco enquanto se digita. */
export interface BlockDraft {
  key: number
  type: BlockType
  text: string
  /** Bloco de tipo desconhecido: preservado sem edição. */
  raw?: LeafBlock
}
export interface SectionDraft {
  key: number
  title: string
  full: boolean
  blocks: BlockDraft[]
}

let counter = 0
const nextKey = () => ++counter
const known = (t: string): t is BlockType => t in BLOCK_TYPE_LABEL

export function toDrafts(sections: Section[]): SectionDraft[] {
  return sections.map((s) => ({
    key: nextKey(),
    title: s.title ?? '',
    full: s.full === true,
    blocks: s.blocks.map((b) =>
      known(b.type) ? { key: nextKey(), type: b.type, text: blockToText(b) } : { key: nextKey(), type: 'text', text: '', raw: b },
    ),
  }))
}

/** Seções prontas para salvar: sem chaves `undefined`, sem seções vazias. */
export function fromDrafts(drafts: SectionDraft[]): Section[] {
  return drafts
    .map((d): Section => {
      const out: Section = { blocks: d.blocks.map((b) => b.raw ?? textToBlock(b.type, b.text)) }
      if (d.title.trim()) out.title = d.title.trim()
      if (d.full) out.full = true
      return out
    })
    .filter((s) => s.title !== undefined || s.blocks.length > 0)
}

interface Props {
  value: SectionDraft[]
  onChange: (next: SectionDraft[]) => void
}

export function SectionsEditor({ value, onChange }: Props) {
  const patch = (i: number, p: Partial<SectionDraft>) => onChange(value.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const patchBlock = (i: number, k: number, p: Partial<BlockDraft>) =>
    patch(i, { blocks: value[i].blocks.map((b) => (b.key === k ? { ...b, ...p } : b)) })
  const move = (i: number, by: -1 | 1) => {
    const next = [...value]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    onChange(next)
  }

  return (
    <div className="grid gap-3">
      {value.map((s, i) => (
        <fieldset key={s.key} className="grid gap-3 rounded-xl border border-border bg-surface p-3">
          <legend className="px-1 font-mono text-[11px] tracking-wider text-label uppercase">Seção {i + 1}</legend>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Título da seção" className="min-w-48 flex-1">
              <Input value={s.title} onChange={(e) => patch(i, { title: e.target.value })} />
            </Field>
            <label className="flex h-8 items-center gap-2 text-sm">
              <Checkbox checked={s.full} onCheckedChange={(c) => patch(i, { full: c === true })} />
              Largura total
            </label>
            <div className="flex gap-1">
              <Button type="button" variant="outline" size="sm" disabled={i === 0} aria-label={`Subir seção ${i + 1}`} onClick={() => move(i, -1)}>
                Subir
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={i === value.length - 1} aria-label={`Descer seção ${i + 1}`} onClick={() => move(i, 1)}>
                Descer
              </Button>
              <Button type="button" variant="destructive" size="sm" aria-label={`Remover seção ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
                Remover
              </Button>
            </div>
          </div>

          {s.blocks.map((b, n) => (
            <div key={b.key} className="grid gap-2 rounded-lg border border-border p-2.5">
              {b.raw ? (
                <p className="text-sm text-muted">Bloco de tipo desconhecido; será mantido como está.</p>
              ) : (
                <>
                  <div className="flex items-end gap-3">
                    <Field label={`Tipo do bloco ${n + 1} da seção ${i + 1}`} className="w-44">
                      <NativeSelect value={b.type} onChange={(e) => patchBlock(i, b.key, { type: e.target.value as BlockType })}>
                        {(Object.keys(BLOCK_TYPE_LABEL) as BlockType[]).map((t) => (
                          <option key={t} value={t}>
                            {BLOCK_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <span className="flex-1 pb-1.5 text-xs text-muted">{BLOCK_TYPE_HINT[b.type]}</span>
                  </div>
                  <Textarea
                    aria-label={`Conteúdo do bloco ${n + 1} da seção ${i + 1}`}
                    rows={4}
                    value={b.text}
                    onChange={(e) => patchBlock(i, b.key, { text: e.target.value })}
                    className="font-mono text-xs"
                  />
                </>
              )}
              <div>
                <Button type="button" variant="ghost" size="sm" aria-label={`Remover bloco ${n + 1} da seção ${i + 1}`} onClick={() => patch(i, { blocks: s.blocks.filter((x) => x.key !== b.key) })}>
                  Remover bloco
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patch(i, { blocks: [...s.blocks, { key: nextKey(), type: 'text', text: '' }] })}
            >
              Adicionar bloco
            </Button>
          </div>
        </fieldset>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...value, { key: nextKey(), title: '', full: false, blocks: [{ key: nextKey(), type: 'text', text: '' }] }])}
        >
          Adicionar seção
        </Button>
      </div>
    </div>
  )
}
