import type { LeafBlock } from '@/lib/types'
import { factsOf, formatDate, groupTasks, leadName, memberRoles } from './model'
import type { ExportDoc, ExportItem, ExportProject, ExportTask } from './model'

const str = (v: unknown) => String(v ?? '')

/** Escapa só o que o CommonMark interpretaria dentro de uma linha. */
const inlineEsc = (s: string) => s.replace(/[\\*_`[\]<>]/g, '\\$&')

/** Escapa o que viraria título, lista, citação, cerca ou linha de título (setext) no começo da linha. */
function startEsc(line: string): string {
  return line
    .replace(/^(#{1,6})(?=\s|$)/, '\\$1')
    .replace(/^([-+])(?=\s|$|-)/, '\\$1')
    .replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
    .replace(/^(=+)(?=\s*$)/, '\\$1')
    .replace(/^~~~/, '\\~~~')
}

/** Texto de várias linhas, cada linha escapada e mantida no seu lugar. */
const lines = (v: unknown): string[] =>
  str(v)
    .split(/\r?\n/)
    .map((l) => startEsc(inlineEsc(l.trim())))

/** Texto numa linha só, seguro para ir depois de "- ", "1. " etc. */
const oneLine = (v: unknown) =>
  startEsc(
    inlineEsc(
      str(v)
        .replace(/\s*[\r\n]+\s*/g, ' ')
        .trim(),
    ),
  )

/** Texto numa linha só para ir no meio de uma linha (sem tratar o começo). */
const inline = (v: unknown) =>
  inlineEsc(
    str(v)
      .replace(/\s*[\r\n]+\s*/g, ' ')
      .trim(),
  )

const cell = (v: unknown) => inline(v).replace(/\|/g, '\\|')
const row = (cells: unknown[]) => `| ${cells.map(cell).join(' | ')} |`
const table = (headers: unknown[], rows: unknown[][]) =>
  [row(headers), row(headers.map(() => '---')), ...rows.map(row)].join('\n')

const heading = (level: number, escapedText: string) =>
  `${'#'.repeat(Math.min(level, 6))} ${escapedText.replace(/(\s)#+$/, '$1\\#')}`

interface Chunk {
  text: string
  list?: boolean
}

function block(b: LeafBlock): Chunk | null {
  switch (b.type) {
    case 'text': {
      const t = lines(b.text)
      return t.join('').trim() ? { text: t.join('\n') } : null
    }
    case 'callout': {
      const t = lines(b.text)
      return t.join('').trim() ? { text: t.map((l) => (l ? `> ${l}` : '>')).join('\n') } : null
    }
    case 'list':
      return b.items?.length ? { text: b.items.map((i) => `- ${oneLine(i)}`).join('\n'), list: true } : null
    case 'checklist':
      return b.items?.length
        ? {
            text: b.items
              .map((i) => `- [${i.done ? 'x' : ' '}] ${oneLine(i.text)}${i.note ? ` (${inline(i.note)})` : ''}`)
              .join('\n'),
            list: true,
          }
        : null
    case 'table':
      return b.headers?.length ? { text: table(b.headers, b.rows ?? []) } : null
    case 'decisions':
      return b.items?.length
        ? {
            text: b.items.map((d, i) => `${i + 1}. **${inline(d.label)}** ${inline(d.text)}`).join('\n'),
            list: true,
          }
        : null
    default:
      return null
  }
}

function itemLines(label: string, items: ExportItem[]): string[] {
  if (!items.length) return []
  return [`  - ${label}`, ...items.map((i) => `    - [${i.done ? 'x' : ' '}] ${oneLine(i.text)}`)]
}

function taskLines(t: ExportTask): string[] {
  const meta = [t.assignee, t.sprint, t.dueOn ? `até ${formatDate(t.dueOn)}` : null]
    .filter(Boolean)
    .map(inline)
    .join(' · ')
  const out = [`- [${t.status === 'done' ? 'x' : ' '}] ${oneLine(t.title)}${meta ? ` — ${meta}` : ''}`]
  const desc = t.description && t.description.trim() ? lines(t.description) : []
  if (desc.length) out.push('', ...desc.map((l) => (l ? `  ${l}` : '')), '')
  return [...out, ...itemLines('Escopo', t.scope), ...itemLines('Testes', t.tests)]
}

function projectMd(p: ExportProject, level: number): string {
  const { project } = p
  const chunks: Chunk[] = []
  const add = (text: string, list = false) => chunks.push({ text, list })
  add(heading(level, `${inline(project.number)} · ${inline(project.title)}`))
  add(`**Status:** ${inline(project.status_label)}`)
  if (project.summary) add(lines(project.summary).join('\n'))
  const facts = factsOf(project)
  if (facts.length) add(facts.map((f) => `- **${inline(f.label)}:** ${inline(f.value)}`).join('\n'), true)
  if (p.team.length) {
    add(heading(level + 1, 'Equipe'))
    add(
      p.team
        .map(
          (m) =>
            `- ${oneLine(m.name)}${memberRoles(m) ? ` — ${inline(memberRoles(m))}` : ''}${m.isLead ? ' (frente)' : ''}`,
        )
        .join('\n'),
      true,
    )
  }
  for (const s of project.sections ?? []) {
    const body = (s.blocks ?? []).map(block).filter((x): x is Chunk => x !== null)
    if (!body.length) continue
    if (s.title && s.title.trim()) add(heading(level + 1, inline(s.title)))
    chunks.push(...body)
  }
  if (p.tasks.length) {
    add(heading(level + 1, `Tarefas (${p.progress.done}/${p.progress.total} feitas)`))
    for (const g of groupTasks(p.tasks)) {
      add(heading(level + 2, g.label))
      add(g.tasks.map((t) => taskLines(t).join('\n')).join('\n'), true)
    }
  }
  // Duas listas seguidas virariam uma só; o comentário HTML as separa.
  const out: string[] = []
  chunks.forEach((c, i) => {
    if (i > 0 && c.list && chunks[i - 1].list) out.push('<!-- -->')
    out.push(c.text)
  })
  return out.join('\n\n')
}

export function toMarkdown(doc: ExportDoc): string {
  const date = doc.generatedAt ? formatDate(doc.generatedAt) : ''
  const out: string[] = []
  if (doc.all) {
    out.push(heading(1, `LASETE · ${inline(doc.title)}`))
    if (date) out.push(`Gerado em ${date}`)
    if (doc.projects.length) {
      out.push(
        table(
          ['Nº', 'Projeto', 'Frente', 'Status', 'Tarefas feitas'],
          doc.projects.map((p) => [
            p.project.number,
            p.project.title,
            leadName(p),
            p.project.status_label,
            `${p.progress.done}/${p.progress.total}`,
          ]),
        ),
      )
    }
    for (const p of doc.projects) out.push(projectMd(p, 2))
  } else {
    for (const p of doc.projects) out.push(projectMd(p, 1))
    out.push(`LASETE${date ? ` · gerado em ${date}` : ''}`)
  }
  return out.join('\n\n') + '\n'
}
