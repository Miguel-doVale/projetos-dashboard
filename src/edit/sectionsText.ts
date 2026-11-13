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

// Escapes com barra invertida: `\\`, `\[x]` (início de item não feito), `\|` (célula), `\--` (" -- " literal)
// e `\:` (dois-pontos no rótulo). Separadores só valem quando não escapados.
type Ch = { c: string; esc: boolean }

function scan(s: string): Ch[] {
  const out: Ch[] = []
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) out.push({ c: s[++i], esc: true })
    else out.push({ c: s[i], esc: false })
  }
  return out
}
const str = (cs: Ch[]) => cs.map((x) => x.c).join('')
const at = (cs: Ch[], i: number, text: string) => text.split('').every((t, k) => cs[i + k] && !cs[i + k].esc && cs[i + k].c === t)
const escapeSlash = (s: string) => s.replace(/\\/g, '\\\\')

const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

const NOTE = ' -- '

function checklistToLine(i: { text: string; done?: boolean; note?: string }): string {
  let text = escapeSlash(i.text).replace(/(?<= )--/g, '\\--')
  if (!i.done && /^\[x\]/i.test(text)) text = `\\${text}`
  return `${i.done ? '[x] ' : ''}${text}${i.note ? `${NOTE}${escapeSlash(i.note)}` : ''}`
}

function lineToChecklist(line: string) {
  let cs = scan(line)
  const done = cs.length >= 3 && cs[0].c === '[' && !cs[0].esc && cs[2].c === ']' && !cs[2].esc && cs[1].c.toLowerCase() === 'x' && !cs[1].esc
  if (done) {
    cs = cs.slice(3)
    while (cs.length && !cs[0].esc && /\s/.test(cs[0].c)) cs = cs.slice(1)
  }
  let sep = -1
  for (let i = 0; i < cs.length && sep < 0; i++) if (at(cs, i, NOTE)) sep = i
  const item: { text: string; done?: boolean; note?: string } = {
    text: str(sep < 0 ? cs : cs.slice(0, sep)).trim(),
  }
  if (done) item.done = true
  if (sep >= 0) item.note = str(cs.slice(sep + NOTE.length)).trim()
  return item
}

const cellOut = (c: string) => escapeSlash(c).replace(/\|/g, '\\|')
function rowToLine(row: string[]): string {
  const line = row.map(cellOut).join(' | ').trim()
  // Linha de uma célula vazia: a barra sozinha a mantém viva.
  return line === '' ? '\\' : line
}

function lineToRow(line: string): string[] {
  if (line === '\\') return ['']
  const cells: Ch[][] = [[]]
  for (const ch of scan(line)) {
    if (ch.c === '|' && !ch.esc) cells.push([])
    else cells[cells.length - 1].push(ch)
  }
  return cells.map((c) => str(c).trim())
}

const labelOut = (l: string) => escapeSlash(l).replace(/:/g, '\\:')

export function blockToText(b: LeafBlock): string {
  switch (b.type) {
    case 'text':
    case 'callout':
      return b.text
    case 'list':
      return b.items.join('\n')
    case 'checklist':
      return b.items.map(checklistToLine).join('\n')
    case 'table':
      return [b.headers, ...b.rows].map(rowToLine).join('\n')
    case 'decisions':
      return b.items.map((i) => `${labelOut(i.label)}: ${escapeSlash(i.text)}`).join('\n')
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
      return { type, items: lines(text).map(lineToChecklist) }
    case 'table': {
      const [head, ...body] = lines(text).map(lineToRow)
      // Linhas mais largas que o cabeçalho estendem o cabeçalho em vez de perder células.
      const width = Math.max(head?.length ?? 0, ...body.map((r) => r.length))
      const pad = (r: string[]) => [...r, ...Array<string>(width - r.length).fill('')]
      return { type, headers: pad(head ?? []), rows: body.map(pad) }
    }
    case 'decisions':
      return {
        type,
        items: lines(text).map((line) => {
          const cs = scan(line)
          const k = cs.findIndex((x) => x.c === ':' && !x.esc)
          return k < 0
            ? { label: '', text: str(cs).trim() }
            : { label: str(cs.slice(0, k)).trim(), text: str(cs.slice(k + 1)).trim() }
        }),
      }
  }
}

export function isEmptyBlock(b: LeafBlock): boolean {
  switch (b.type) {
    case 'text':
    case 'callout':
      return b.text === ''
    case 'table':
      return b.headers.length === 0 && b.rows.length === 0
    default:
      return b.items.length === 0
  }
}
