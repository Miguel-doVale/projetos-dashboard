export type Access = 'owner' | 'member' | 'none'
export type ProjectKind = 'projeto' | 'colaboracao' | 'gadget'
export type StatusLevel = 'on' | 'half' | 'off'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type ItemKind = 'scope' | 'test'

export type LeafBlock =
  | { type: 'text'; text: string }
  | { type: 'callout'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'checklist'; items: { text: string; done?: boolean; note?: string }[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'decisions'; items: { label: string; text: string }[] }

export type Section = { title?: string; full?: boolean; blocks: LeafBlock[] }
export type Fact = { label: string; value: string }

export interface Person {
  id: string
  created_at: string | null
  name: string
  role: string | null
  area: string | null
  email: string | null
  /** UID do login no Firebase; nulo enquanto a pessoa não tem login. */
  uid: string | null
}

export interface Project {
  id: string
  created_at: string | null
  position: number
  number: string
  title: string
  kind: ProjectKind
  status_level: StatusLevel
  status_label: string
  summary: string | null
  deadline: string | null
  facts: Fact[]
  sections: Section[]
}

export interface ProjectMember {
  id: string
  created_at: string | null
  project_id: string
  person_id: string
  role: string | null
  is_lead: boolean
}

export interface Sprint {
  id: string
  created_at: string | null
  name: string
  starts_on: string | null
  ends_on: string | null
}

export interface Task {
  id: string
  created_at: string | null
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  assignee_id: string | null
  sprint_id: string | null
  due_on: string | null
  position: number
}

export interface TaskItem {
  id: string
  created_at: string | null
  task_id: string
  kind: ItemKind
  text: string
  done: boolean
  position: number
}

export interface Page {
  id: string
  created_at: string | null
  position: number
  slug: string
  title: string
  blocks: Section[]
}

export interface Tables {
  people: Person
  projects: Project
  project_members: ProjectMember
  sprints: Sprint
  tasks: Task
  task_items: TaskItem
  pages: Page
}

export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T]
