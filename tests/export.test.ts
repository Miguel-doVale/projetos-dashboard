import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText, printHtml } from '@/export/download'
import { toHtml } from '@/export/html'
import { toMarkdown } from '@/export/markdown'
import { buildExport, fileName } from '@/export/model'
import type { ExportDoc } from '@/export/model'
import type { Person, Project, ProjectMember, Sprint, Task, TaskItem } from '@/lib/types'

vi.mock('@/export/font', () => ({ fontDataUrl: 'data:font/woff2;base64,AAAA' }))

const FONT = 'data:font/woff2;base64,AAAA'
const NOW = '2026-11-13T15:00:00.000Z'

const person = (id: string, name: string, role: string | null = null): Person => ({
  id, created_at: null, name, role, area: null, email: null, uid: null,
})
const project = (id: string, position: number, title: string, over: Partial<Project> = {}): Project => ({
  id, created_at: null, position, number: String(position).padStart(2, '0'), title, kind: 'projeto',
  status_level: 'on', status_label: 'Em andamento', summary: null, deadline: null, facts: [], sections: [], ...over,
})
const member = (id: string, project_id: string, person_id: string, is_lead = false): ProjectMember => ({
  id, created_at: null, project_id, person_id, role: 'Dev', is_lead,
})
const sprint = (id: string, name: string): Sprint => ({ id, created_at: null, name, starts_on: null, ends_on: null })
const task = (id: string, project_id: string, title: string, status: Task['status'], over: Partial<Task> = {}): Task => ({
  id, created_at: null, project_id, title, description: null, status, assignee_id: null, sprint_id: null,
  due_on: null, position: 1, ...over,
})
const item = (id: string, task_id: string, kind: TaskItem['kind'], text: string, done: boolean, position = 1): TaskItem => ({
  id, created_at: null, task_id, kind, text, done, position,
})

const data = {
  people: [person('a', 'Ana Souza', 'Diretora'), person('b', 'Beto Lima')],
  projects: [
    project('p2', 2, 'Segundo'),
    project('p1', 1, 'Máscara da LASETE', {
      summary: 'Resumo',
      deadline: '2026-12-01',
      facts: [{ label: 'Área', value: 'Hardware' }],
      sections: [
        { title: 'Dados', blocks: [
          { type: 'table', headers: ['A|B', 'C'], rows: [['x|y', 'linha1\nlinha2']] },
          { type: 'decisions', items: [{ label: 'Pilha', text: 'Li-ion' }] },
          { type: 'list', items: ['um\ndois'] },
          { type: 'checklist', items: [{ text: 'feito', done: true }, { text: 'falta' }] },
          { type: 'callout', text: 'Atenção' },
          { type: 'text', text: 'Texto' },
        ] },
      ],
    }),
  ],
  members: [member('m1', 'p1', 'b'), member('m2', 'p1', 'a', true)],
  sprints: [sprint('s1', 'Sprint 1')],
  tasks: [
    task('t1', 'p1', 'Pronta', 'done', { position: 2 }),
    task('t2', 'p1', 'Pendente', 'todo', { position: 1, assignee_id: 'a', sprint_id: 's1', due_on: '2026-11-20' }),
    task('t3', 'p1', 'Em curso', 'doing', { position: 3 }),
  ],
  items: [
    item('i1', 't2', 'scope', 'Cortar peça', true),
    item('i2', 't2', 'test', 'Encaixa no rosto', false),
    item('i3', 't1', 'scope', 'Item feito', true),
  ],
}

const doc = (projectId?: string) => ({ ...structuredClone(buildExport(data, projectId)), generatedAt: NOW })
const dark = (d: ExportDoc) => toHtml(d, { theme: 'dark', fontDataUrl: FONT })
const emptyDoc = (): ExportDoc => ({
  title: 'Vazio', generatedAt: NOW,
  projects: [{ project: project('e', 1, 'Vazio'), team: [], tasks: [], progress: { done: 0, total: 0 } }],
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('buildExport', () => {
  it('sem projectId traz todos na ordem de position; com projectId só ele', () => {
    expect(doc().projects.map((p) => p.project.id)).toEqual(['p1', 'p2'])
    expect(doc('p2').projects.map((p) => p.project.id)).toEqual(['p2'])
    expect(doc('p2').title).toBe('Segundo')
  })

  it('resolve equipe (frente primeiro), responsável, sprint e itens', () => {
    const p = doc('p1').projects[0]
    expect(p.team.map((t) => [t.name, t.leagueRole, t.projectRole, t.isLead])).toEqual([
      ['Ana Souza', 'Diretora', 'Dev', true],
      ['Beto Lima', null, 'Dev', false],
    ])
    expect(p.progress).toEqual({ done: 1, total: 3 })
    const t = p.tasks.find((x) => x.title === 'Pendente')!
    expect(t).toMatchObject({ assignee: 'Ana Souza', sprint: 'Sprint 1', dueOn: '2026-11-20', statusLabel: 'A fazer' })
    expect(t.scope).toEqual([{ text: 'Cortar peça', done: true }])
    expect(t.tests).toEqual([{ text: 'Encaixa no rosto', done: false }])
  })
})

describe('toMarkdown', () => {
  it('tarefas com caixa marcada, grupos por status e itens aninhados', () => {
    const md = toMarkdown(doc('p1'))
    expect(md).toContain('- [x] Pronta')
    expect(md).toContain('- [ ] Pendente — Ana Souza · Sprint 1 · até 20/11/2026')
    expect(md).toContain('  - Escopo\n    - [x] Cortar peça\n  - Testes\n    - [ ] Encaixa no rosto')
    expect(md.indexOf('### A fazer')).toBeLessThan(md.indexOf('### Fazendo'))
    expect(md.indexOf('### Fazendo')).toBeLessThan(md.indexOf('### Feito'))
    expect(md).toContain('gerado em 13/11/2026')
  })

  it('escapa | em tabelas e achata quebras de linha', () => {
    const md = toMarkdown(doc('p1'))
    expect(md).toContain('| A\\|B | C |')
    expect(md).toContain('| x\\|y | linha1 linha2 |')
    expect(md).toContain('- um dois')
    expect(md).toContain('1. **Pilha** Li-ion')
    expect(md).toContain('- [x] feito')
    expect(md).toContain('- [ ] falta')
  })

  it('exportação geral começa pela tabela de visão geral', () => {
    const md = toMarkdown(doc())
    expect(md.indexOf('| Nº | Projeto | Frente | Status | Tarefas feitas |')).toBeGreaterThan(-1)
    expect(md).toContain('| 01 | Máscara da LASETE | Ana Souza | Em andamento | 1/3 |')
    expect(md.indexOf('Gerado em 13/11/2026')).toBeGreaterThan(-1)
    expect(md.indexOf('| Nº')).toBeLessThan(md.indexOf('## 01 · Máscara da LASETE'))
  })

  it('projeto vazio não tem Equipe, Tarefas nem tabela', () => {
    const md = toMarkdown(emptyDoc())
    expect(md).not.toMatch(/Equipe|Tarefas|\|/)
  })
})

describe('toHtml', () => {
  it('escapa o título', () => {
    const d = doc('p1')
    d.projects[0].project.title = '<script>alert(1)</script> & cia'
    const html = dark(d)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; cia')
    expect(html).not.toContain('<script')
  })

  it('é estático e não referencia URL externa', () => {
    for (const html of [dark(doc()), toHtml(doc(), { theme: 'print', fontDataUrl: FONT })]) {
      expect(html).not.toContain('<script')
      expect(html).not.toMatch(/(src=|href=|url\()\s*["']?https?:\/\//)
      expect(html).not.toMatch(/https?:\/\//)
    }
  })

  it('tema dark embute a fonte e as cores do site', () => {
    const html = dark(doc())
    expect(html).toContain('data:font/woff2')
    expect(html).toContain('#000')
    expect(html).toContain('#9cddbd')
    expect(html).toContain('13/11/2026')
    expect(html).toContain('Máscara da LASETE')
  })

  it('tema print é claro e evita quebra dentro dos cards', () => {
    const html = toHtml(doc(), { theme: 'print', fontDataUrl: FONT })
    expect(html).toContain('--bg:#fff')
    expect(html).toContain('--fg:#111')
    expect(html).toMatch(/\.card\{[^}]*break-inside:avoid/)
  })

  it('projeto vazio não tem Equipe, Tarefas nem tabela', () => {
    const html = dark(emptyDoc())
    expect(html).not.toMatch(/Equipe|Tarefas|<table/)
  })
})

describe('fileName', () => {
  it('usa Projetos ou o título sem acentos, com a data', () => {
    expect(fileName(doc(), 'md')).toBe('LASETE_Projetos_2026-11-13.md')
    const d = { ...doc(), title: 'Máscara da LASETE' }
    expect(fileName(d, 'html')).toBe('LASETE_Mascara-da-LASETE_2026-11-13.html')
  })
})

describe('downloadText', () => {
  it('baixa por Blob URL e revoga', () => {
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('a.md')
      expect(this.href).toBe('blob:x')
    })
    downloadText('a.md', 'text/markdown', '# oi')
    expect(click).toHaveBeenCalledOnce()
    expect(revoke).toHaveBeenCalledWith('blob:x')
    expect(document.querySelector('a')).toBeNull()
  })
})

describe('printHtml', () => {
  // O jsdom não implementa print(); troca a janela do iframe por uma que registra as chamadas.
  const fakeWindow = () => {
    const win = Object.assign(new EventTarget(), { print: vi.fn(), focus: vi.fn() })
    vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(win as unknown as Window)
    return win
  }
  const load = (frame: HTMLIFrameElement, win: { print: unknown }) => {
    if (!(win.print as ReturnType<typeof vi.fn>).mock.calls.length) frame.dispatchEvent(new Event('load'))
  }

  it('escreve em iframe oculto, imprime e remove depois do afterprint', () => {
    const win = fakeWindow()
    printHtml('<p>oi</p>')
    const frame = document.querySelector('iframe')!
    expect(frame.srcdoc).toBe('<p>oi</p>')
    expect(frame.getAttribute('aria-hidden')).toBe('true')
    load(frame, win)
    expect(win.print).toHaveBeenCalledOnce()
    expect(document.querySelector('iframe')).not.toBeNull()
    win.dispatchEvent(new Event('afterprint'))
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('remove o iframe pelo tempo limite se afterprint não vier', () => {
    vi.useFakeTimers()
    const win = fakeWindow()
    printHtml('<p>oi</p>')
    load(document.querySelector('iframe')!, win)
    expect(win.print).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(61_000)
    expect(document.querySelector('iframe')).toBeNull()
  })
})
