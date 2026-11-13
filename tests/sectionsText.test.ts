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

  const tricky: [string, LeafBlock][] = [
    ['checklist com " -- " no texto e sem nota', { type: 'checklist', items: [{ text: 'a -- b' }] }],
    ['checklist com " -- " no texto e com nota', { type: 'checklist', items: [{ text: 'a -- b', note: 'c -- d' }] }],
    ['checklist com texto terminando em " --" e nota', { type: 'checklist', items: [{ text: 'a --', note: 'n' }] }],
    ['checklist não feito começando com [x]', { type: 'checklist', items: [{ text: '[x] parece feito' }] }],
    ['checklist feito começando com [x]', { type: 'checklist', items: [{ text: '[x] dentro', done: true }] }],
    ['checklist com barra invertida', { type: 'checklist', items: [{ text: 'C:\\pasta\\', note: '\\' }] }],
    ['tabela com | na célula', { type: 'table', headers: ['A', 'B'], rows: [['a|b', 'c | d']] }],
    ['tabela com barra invertida antes de |', { type: 'table', headers: ['A'], rows: [['x\\|y']] }],
    ['tabela com linha de uma célula vazia', { type: 'table', headers: ['A'], rows: [[''], ['x']] }],
    ['tabela com linha toda vazia', { type: 'table', headers: ['A', 'B'], rows: [['', ''], ['x', '']] }],
    ['decisão com : no rótulo', { type: 'decisions', items: [{ label: 'Prazo: v2', text: 'a: b' }] }],
    ['decisão com rótulo vazio', { type: 'decisions', items: [{ label: '', text: 'só texto' }] }],
  ]
  it.each(tricky)('ida e volta: %s', (_name, b) => {
    expect(textToBlock(b.type, blockToText(b))).toEqual(b)
  })

  it('célula com | sem espaços também separa células ao digitar', () => {
    expect(textToBlock('table', 'A|B\n1|2')).toEqual({ type: 'table', headers: ['A', 'B'], rows: [['1', '2']] })
  })

  it('linha mais larga que o cabeçalho estende o cabeçalho em vez de perder células', () => {
    expect(textToBlock('table', 'A\n1 | 2 | 3')).toEqual({
      type: 'table',
      headers: ['A', '', ''],
      rows: [['1', '2', '3']],
    })
  })
})
