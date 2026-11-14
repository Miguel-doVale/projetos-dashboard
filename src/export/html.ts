import type { LeafBlock } from '@/lib/types'
import { factsOf, formatDate, groupTasks, leadName, memberRoles } from './model'
import type { ExportDoc, ExportItem, ExportProject, ExportTask } from './model'

export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface HtmlOptions {
  theme: 'dark' | 'print'
  fontDataUrl: string
}

const DARK = `--bg:#000;--surface:#0a0e0c;--raised:#111714;--fg:#f0f5f2;--muted:#a0aaa5;--border:#252d29;--accent:#9cddbd;--label:#a8cbb8;--on:#9cddbd;--half:#e6c15c;--off:#a0aaa5;--chip-bg:#f0f5f2;--chip-fg:#000;`
const PRINT = `--bg:#fff;--surface:#fff;--raised:#f6f8f7;--fg:#111;--muted:#555;--border:#d4dad7;--accent:#1f7a52;--label:#2f6b4f;--on:#1f7a52;--half:#8a6a00;--off:#555;--chip-bg:#111;--chip-fg:#fff;`

function css(opts: HtmlOptions): string {
  const font = opts.fontDataUrl.replace(/["\\\n\r]/g, '')
  return `
@font-face{font-family:'Geist Variable';font-style:normal;font-weight:100 900;src:url("${font}") format('woff2')}
:root{${opts.theme === 'dark' ? DARK : PRINT}}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:var(--bg);color:var(--fg);font-family:'Geist Variable',system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.55}
.wrap{max-width:1280px;margin:0 auto;padding:40px 24px 64px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
.label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--label);font-weight:400;margin:0}
.muted{color:var(--muted)}
header.doc{border-bottom:1px solid var(--border);padding-bottom:24px;margin-bottom:32px}
header.doc h1{font-size:40px;line-height:1.08;letter-spacing:-.02em;font-weight:650;margin:8px 0 6px}
h2{font-size:26px;line-height:1.15;letter-spacing:-.01em;font-weight:650;margin:0}
h3{font-size:18px;font-weight:650;margin:0}
p{margin:0;white-space:pre-line}
.card{background:var(--raised);border:1px solid var(--border);border-radius:12px;padding:16px 18px;break-inside:avoid;page-break-inside:avoid}
.project{margin:0 0 56px}
.project>*+*{margin-top:24px}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.chip{background:var(--chip-bg);color:var(--chip-fg);border-radius:6px;padding:1px 8px;font-weight:600}
.status{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;border:1px solid var(--border);border-radius:999px;padding:2px 10px}
.status.on{color:var(--on)}.status.half{color:var(--half)}.status.off{color:var(--off)}
dl.facts{display:flex;flex-wrap:wrap;gap:12px 40px;margin:0}
dl.facts dd{margin:2px 0 0}
dl.facts dt{margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.sections .full{grid-column:1/-1}
.card>*+*{margin-top:12px}
ul,ol{margin:0;padding-left:20px}
li+li{margin-top:4px}
ul.check{list-style:none;padding:0}
ul.check li{display:flex;gap:10px}
ul.check .box{flex:none;width:12px;height:12px;margin-top:5px;border:1px solid var(--border);border-radius:3px}
ul.check .done .box{background:var(--accent);border-color:var(--accent)}
ul.check .done .txt{text-decoration:line-through;color:var(--muted)}
.callout{border-left:2px solid var(--accent);background:var(--raised);padding:8px 12px}
table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}
th{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--label);font-weight:400}
th,td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
tr:last-child td{border-bottom:0}
.tablebox{border:1px solid var(--border);border-radius:8px;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
.tablebox table th{background:var(--raised)}
.overview{margin-bottom:56px}
.tasks .group>*+*{margin-top:10px}
.tasks .group+.group{margin-top:20px}
.task .meta{color:var(--muted);font-size:13px}
.task .sub{margin-top:10px}
footer{border-top:1px solid var(--border);padding-top:16px;color:var(--muted)}
@page{margin:14mm}
@media (max-width:720px){.sections{grid-template-columns:1fr}header.doc h1{font-size:30px}}
@media print{.wrap{padding:0;max-width:none}.project{margin-bottom:32px}}
`
}

function blockHtml(b: LeafBlock): string {
  switch (b.type) {
    case 'text':
      return String(b.text ?? '').trim() ? `<p>${esc(b.text)}</p>` : ''
    case 'callout':
      return String(b.text ?? '').trim() ? `<p class="callout">${esc(b.text)}</p>` : ''
    case 'list':
      return b.items.length ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''
    case 'checklist':
      return b.items.length
        ? `<ul class="check">${b.items
            .map(
              (i) =>
                `<li class="${i.done ? 'done' : ''}"><span class="box"></span><span class="txt">${esc(i.text)}${i.note ? ` <span class="muted">${esc(i.note)}</span>` : ''}</span></li>`,
            )
            .join('')}</ul>`
        : ''
    case 'table':
      return b.headers.length
        ? `<div class="tablebox"><table><thead><tr>${b.headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`
        : ''
    case 'decisions':
      return b.items.length
        ? `<ol>${b.items.map((d) => `<li>${d.label?.trim() ? `<strong>${esc(d.label)}</strong> ` : ''}${esc(d.text)}</li>`).join('')}</ol>`
        : ''
    default:
      return ''
  }
}

function itemList(label: string, items: ExportItem[]): string {
  if (!items.length) return ''
  return `<div class="sub"><p class="label">${label}</p><ul class="check">${items
    .map(
      (i) =>
        `<li class="${i.done ? 'done' : ''}"><span class="box"></span><span class="txt">${esc(i.text)}</span></li>`,
    )
    .join('')}</ul></div>`
}

function taskHtml(t: ExportTask): string {
  const meta = [t.assignee, t.sprint, t.dueOn ? `até ${formatDate(t.dueOn)}` : null]
    .filter(Boolean)
    .map(esc)
    .join(' · ')
  return `<article class="card task"><h3>${esc(t.title)}</h3>${meta ? `<p class="meta">${meta}</p>` : ''}${
    t.description ? `<p class="sub">${esc(t.description)}</p>` : ''
  }${itemList('Escopo', t.scope)}${itemList('Testes', t.tests)}</article>`
}

function projectHtml(p: ExportProject): string {
  const { project } = p
  const parts: string[] = []
  parts.push(
    `<div class="row"><span class="chip mono">${esc(project.number)}</span><span class="status ${esc(project.status_level)}">${esc(project.status_label)}</span></div>`,
    `<h2>${esc(project.title)}</h2>`,
  )
  if (project.summary) parts.push(`<p class="muted">${esc(project.summary)}</p>`)
  const facts = factsOf(project)
  if (facts.length) {
    parts.push(
      `<dl class="facts">${facts.map((f) => `<div><dt class="label">${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>`,
    )
  }
  if (p.team.length) {
    parts.push(
      `<div><p class="label">Equipe</p><ul class="grid" style="list-style:none;padding:0;margin-top:10px">${p.team
        .map(
          (m) =>
            `<li class="card"><strong>${esc(m.name)}</strong><p class="mono muted">${esc(memberRoles(m) || '—')}${m.isLead ? ' <span style="color:var(--accent)">Frente</span>' : ''}</p></li>`,
        )
        .join('')}</ul></div>`,
    )
  }
  const sections = (project.sections ?? [])
    .map((s) => {
      const body = (s.blocks ?? []).map(blockHtml).join('')
      if (!body) return ''
      return `<section class="card${s.full ? ' full' : ''}">${s.title ? `<h3 class="label">${esc(s.title)}</h3>` : ''}${body}</section>`
    })
    .join('')
  if (sections) parts.push(`<div class="sections">${sections}</div>`)
  if (p.tasks.length) {
    parts.push(
      `<div class="tasks"><p class="label">Tarefas · ${p.progress.done}/${p.progress.total} feitas</p>${groupTasks(
        p.tasks,
      )
        .map(
          (g) =>
            `<div class="group" style="margin-top:14px"><h3>${esc(g.label)} <span class="mono muted">${g.tasks.length}</span></h3>${g.tasks.map(taskHtml).join('')}</div>`,
        )
        .join('')}</div>`,
    )
  }
  return `<section class="project">${parts.join('')}</section>`
}

function overviewHtml(doc: ExportDoc): string {
  if (!doc.all || !doc.projects.length) return ''
  return `<div class="overview tablebox"><table><thead><tr><th>Nº</th><th>Projeto</th><th>Frente</th><th>Status</th><th>Tarefas feitas</th></tr></thead><tbody>${doc.projects
    .map(
      (p) =>
        `<tr><td class="mono">${esc(p.project.number)}</td><td>${esc(p.project.title)}</td><td>${esc(leadName(p))}</td><td>${esc(p.project.status_label)}</td><td class="mono">${p.progress.done}/${p.progress.total}</td></tr>`,
    )
    .join('')}</tbody></table></div>`
}

export function toHtml(doc: ExportDoc, opts: HtmlOptions): string {
  const date = doc.generatedAt ? formatDate(doc.generatedAt) : ''
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LASETE · ${esc(doc.title)}</title>
<style>${css(opts)}</style>
</head>
<body>
<div class="wrap">
<header class="doc"><p class="label">LASETE · Diretoria de Projetos</p><h1>${esc(doc.title)}</h1>${date ? `<p class="mono muted">Gerado em ${esc(date)}</p>` : ''}</header>
${overviewHtml(doc)}
${doc.projects.map(projectHtml).join('\n')}
<footer class="mono">LASETE${date ? ` · gerado em ${esc(date)}` : ''}</footer>
</div>
</body>
</html>
`
}
