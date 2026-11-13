// Converte supabase/seed.sql em src/data/seedData.ts (rodar com: node scripts/seed-to-ts.mjs).
// Os textos saem exatamente como no SQL ('' vira ').
import { readFileSync, writeFileSync } from 'node:fs'

const sql = readFileSync('supabase/seed.sql', 'utf-8')

/** Lê a lista de tuplas `( ... ), ( ... )` que começa em `from`, devolvendo arrays de valores. */
function tuples(from) {
  const rows = []
  let i = from
  while (i < sql.length) {
    while (/[\s,]/.test(sql[i])) i++
    if (sql[i] !== '(') break
    i++
    const row = []
    while (sql[i] !== ')') {
      while (/[\s,]/.test(sql[i])) i++
      if (sql[i] === "'") {
        let text = ''
        i++
        for (;;) {
          if (sql[i] === "'" && sql[i + 1] === "'") { text += "'"; i += 2 }
          else if (sql[i] === "'") { i++; break }
          else text += sql[i++]
        }
        if (sql.startsWith('::jsonb', i)) { i += 7; text = JSON.parse(text) }
        row.push(text)
      } else {
        const m = /^(null|true|false|-?\d+)/.exec(sql.slice(i))
        if (!m) throw new Error(`valor inesperado em ${i}: ${sql.slice(i, i + 20)}`)
        row.push(m[1] === 'null' ? null : m[1] === 'true' ? true : m[1] === 'false' ? false : Number(m[1]))
        i += m[1].length
      }
    }
    i++
    rows.push(row)
  }
  return rows
}

const after = (marker, skip = 0) => {
  const at = sql.indexOf(marker, skip)
  if (at < 0) throw new Error(`não achei ${marker}`)
  return at + marker.length
}

const people = tuples(after('insert into public.people (name, role, area, email, access) values')).map(
  ([name, role, area, email]) => ({ name, role, area, email, uid: null }),
)
const projects = tuples(after('sections) values')).map(
  ([position, number, title, kind, status_level, status_label, summary, deadline, facts, sections]) => ({
    position, number, title, kind, status_level, status_label, summary, deadline, facts, sections,
  }),
)
const members = tuples(after('from (values', after('insert into public.project_members'))).map(
  ([project, person, is_lead]) => ({ project, person, role: null, is_lead }),
)
const tasks = tuples(after('from (values', after('insert into public.tasks'))).map(
  ([project, title, description, status, position]) => ({ project, title, description, status, position }),
)
const pages = tuples(after('blocks) values')).map(([position, slug, title, blocks]) => ({
  position, slug, title, blocks,
}))

const body = JSON.stringify({ people, projects, members, tasks, pages }, null, 2)
writeFileSync(
  'src/data/seedData.ts',
  `// Gerado por scripts/seed-to-ts.mjs a partir de supabase/seed.sql. Referências por chave:
// membros e tarefas apontam o projeto pelo \`number\` e a pessoa pelo \`name\`; nada tem id.
import type { Page, Person, Project, ProjectMember, Task } from '@/lib/types'

type Free<T> = Omit<T, 'id' | 'created_at'>

export interface SeedData {
  people: Free<Person>[]
  projects: Free<Project>[]
  members: (Omit<Free<ProjectMember>, 'project_id' | 'person_id'> & { project: string; person: string })[]
  tasks: (Omit<Free<Task>, 'project_id' | 'assignee_id' | 'sprint_id' | 'due_on'> & { project: string })[]
  pages: Free<Page>[]
}

export const seedData: SeedData = ${body}
`,
)
console.log(`people ${people.length}, projects ${projects.length}, members ${members.length}, tasks ${tasks.length}, pages ${pages.length}`)
