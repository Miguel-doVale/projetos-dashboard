import { TASK_STATUS_LABEL, progressOf, teamOf } from "@/lib/derive";
import type { DataState } from "@/data/DataProvider";
import type { Project, Task } from "@/lib/types";

export interface ExportMember {
  name: string;
  /** Função na liga (cargo da pessoa). */
  leagueRole: string | null;
  /** Função no projeto. */
  projectRole: string | null;
  isLead: boolean;
}

export interface ExportItem {
  text: string;
  done: boolean;
}

export interface ExportTask {
  title: string;
  description: string | null;
  status: Task["status"];
  statusLabel: string;
  assignee: string | null;
  sprint: string | null;
  dueOn: string | null;
  scope: ExportItem[];
  tests: ExportItem[];
}

export interface ExportProject {
  project: Project;
  team: ExportMember[];
  tasks: ExportTask[];
  progress: { done: number; total: number };
}

export interface ExportDoc {
  title: string;
  /** ISO 8601, informado por quem chama. */
  generatedAt: string;
  projects: ExportProject[];
  /** Verdadeiro na exportação de todos os projetos (inclui a visão geral). */
  all?: boolean;
}

export const STATUS_ORDER: Task["status"][] = ["todo", "doing", "done"];

type Source = Pick<
  DataState,
  "people" | "projects" | "members" | "sprints" | "tasks" | "items"
>;

const byPosition = <T extends { position: number }>(a: T, b: T) =>
  a.position - b.position;

export function buildExport(
  data: Source,
  projectId?: string,
  generatedAt = "",
): ExportDoc {
  const chosen = projectId
    ? data.projects.filter((p) => p.id === projectId)
    : [...data.projects].sort(byPosition);
  const peopleById = new Map(data.people.map((p) => [p.id, p.name]));
  const sprintsById = new Map(data.sprints.map((s) => [s.id, s.name]));

  const projects = chosen.map((project): ExportProject => {
    const team = teamOf(project.id, data.members, data.people).map((t) => ({
      name: t.person.name,
      leagueRole: t.person.role,
      projectRole: t.role,
      isLead: t.is_lead,
    }));
    const own = data.tasks
      .filter((t) => t.project_id === project.id)
      .sort(byPosition);
    const tasks = own.map((t): ExportTask => {
      const items = data.items
        .filter((i) => i.task_id === t.id)
        .sort(byPosition);
      const pick = (kind: "scope" | "test") =>
        items
          .filter((i) => i.kind === kind)
          .map((i) => ({ text: i.text, done: i.done }));
      return {
        title: t.title,
        description: t.description,
        status: t.status,
        statusLabel: TASK_STATUS_LABEL[t.status],
        assignee: (t.assignee_id && peopleById.get(t.assignee_id)) || null,
        sprint: (t.sprint_id && sprintsById.get(t.sprint_id)) || null,
        dueOn: t.due_on,
        scope: pick("scope"),
        tests: pick("test"),
      };
    });
    return {
      project,
      team,
      tasks,
      progress: progressOf(project.id, data.tasks),
    };
  });

  const single = projectId ? projects[0] : undefined;
  return {
    title: single ? single.project.title : "Projetos",
    generatedAt,
    projects,
    all: !projectId,
  };
}

/** Tarefas de um projeto agrupadas por status, na ordem A fazer, Fazendo, Feito; grupos vazios saem. */
export function groupTasks(
  tasks: ExportTask[],
): { status: Task["status"]; label: string; tasks: ExportTask[] }[] {
  return STATUS_ORDER.map((status) => ({
    status,
    label: TASK_STATUS_LABEL[status],
    tasks: tasks.filter((t) => t.status === status),
  })).filter((g) => g.tasks.length > 0);
}

/** Facts do projeto mais o prazo, como na página do projeto. */
export function factsOf(p: Project): { label: string; value: string }[] {
  return [
    ...p.facts,
    ...(p.deadline ? [{ label: "Prazo", value: p.deadline }] : []),
  ];
}

/** yyyy-mm-dd (ou ISO completo) vira dd/mm/yyyy; outro texto passa como está. */
export function formatDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

export function leadName(p: ExportProject): string {
  return p.team.find((t) => t.isLead)?.name ?? "—";
}

export function memberRoles(m: ExportMember): string {
  return [m.leagueRole, m.projectRole].filter(Boolean).join(" · ");
}

export function fileName(doc: ExportDoc, ext: "md" | "html"): string {
  const date =
    /^\d{4}-\d{2}-\d{2}/.exec(doc.generatedAt)?.[0] ??
    doc.generatedAt.slice(0, 10);
  const slug = doc.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `LASETE_${slug || "Projetos"}_${date}.${ext}`;
}
