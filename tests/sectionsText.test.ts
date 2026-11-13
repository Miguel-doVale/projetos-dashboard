import { describe, expect, it } from 'vitest'
import { blockToText, textToBlock } from '@/edit/sectionsText'
import type { LeafBlock } from '@/lib/types'

const blocks: LeafBlock[] = [
  { type: 'text', text: 'Um texto\ncom duas linhas' },
  { type: 'callout', text: 'Atenção' },
  { type: 'list', items: ['a', 'b'] },
  { type: 'checklist', items: [{ text: 'Feito', done: true, note: 'nota' }, { text: 'Aberto' }] },
  { type: 'table', headers: ['A', 'B'], rows: [['1', '2'], ['3', '4']] },
  { type: 'decisions', items: [{ label: 'Stack', text: 'React: rápido' }, { label: 'Prazo', text: 'junho' }] },
]

describe('sectionsText', () => {
  it.each(blocks)('ida e volta: $type', (b) => {
    expect(textToBlock(b.type, blockToText(b))).toEqual(b)
  })

  it('checklist com [x] e nota', () => {
    expect(textToBlock('checklist', '[x] Feito -- nota')).toEqual({
      type: 'checklist',
      items: [{ text: 'Feito', done: true, note: 'nota' }],
    })
  })

  it('tabela completa linhas curtas com vazio', () => {
    expect(textToBlock('table', 'A | B | C\n1 | 2')).toEqual({
      type: 'table',
      headers: ['A', 'B', 'C'],
      rows: [['1', '2', '']],
    })
  })

  it('linhas em branco são ignoradas', () => {
    expect(textToBlock('list', '\n  \n')).toEqual({ type: 'list', items: [] })
    expect(textToBlock('list', 'a\n\nb')).toEqual({ type: 'list', items: ['a', 'b'] })
  })
})
