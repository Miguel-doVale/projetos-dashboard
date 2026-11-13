import type { LeafBlock } from '@/lib/types'

type BlockType = LeafBlock['type']

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  text: 'Texto',
  callout: 'Destaque',
  list: 'Lista',
  checklist: 'Checklist',
  table: 'Tabela',
  decisions: 'Decisões',
}

export const BLOCK_TYPE_HINT: Record<BlockType, string> = {
  text: 'Texto livre.',
  callout: 'Texto em destaque.',
  list: 'Um item por linha.',
  checklist: 'Uma linha por item. Comece com [x] para marcar como feito; use " -- " para uma nota.',
  table: 'A primeira linha é o cabeçalho. Separe as células com " | ".',
  decisions: 'Uma linha por decisão, no formato "Rótulo: texto".',
}

const DONE_PREFIX = /^\[x\]\s*/i
const NOTE_SEPARATOR = ' -- '

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

export function blockToText(b: LeafBlock): string {
  switch (b.type) {
    case 'text':
    case 'callout':
      return b.text
    case 'list':
      return b.items.join('\n')
    case 'checklist':
      return b.items
        .map((i) => `${i.done ? '[x] ' : ''}${i.text}${i.note ? `${NOTE_SEPARATOR}${i.note}` : ''}`)
        .join('\n')
    case 'table':
      return [b.headers, ...b.rows].map((r) => r.join(' | ')).join('\n')
    case 'decisions':
      return b.items.map((i) => `${i.label}: ${i.text}`).join('\n')
  }
}

export function textToBlock(type: BlockType, text: string): LeafBlock {
  switch (type) {
    case 'text':
    case 'callout':
      return { type, text: text.trim() }
    case 'list':
      return { type, items: lines(text) }
    case 'checklist':
      return {
        type,
        items: lines(text).map((line) => {
          const done = DONE_PREFIX.test(line)
          const rest = line.replace(DONE_PREFIX, '')
          const at = rest.indexOf(NOTE_SEPARATOR)
          const item: { text: string; done?: boolean; note?: string } = {
            text: (at < 0 ? rest : rest.slice(0, at)).trim(),
          }
          if (done) item.done = true
          if (at >= 0) item.note = rest.slice(at + NOTE_SEPARATOR.length).trim()
          return item
        }),
      }
    case 'table': {
      const [head, ...body] = lines(text).map((l) => l.split('|').map((c) => c.trim()))
      const headers = head ?? []
      const rows = body.map((r) => headers.map((_, i) => r[i] ?? ''))
      return { type, headers, rows }
    }
    case 'decisions':
      return {
        type,
        items: lines(text).map((line) => {
          const at = line.indexOf(':')
          return at < 0
            ? { label: '', text: line }
            : { label: line.slice(0, at).trim(), text: line.slice(at + 1).trim() }
        }),
      }
  }
}
