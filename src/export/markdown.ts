import type { LeafBlock } from "@/lib/types";
import {
  factsOf,
  formatDate,
  groupTasks,
  leadName,
  memberRoles,
} from "./model";
import type { ExportDoc, ExportItem, ExportProject, ExportTask } from "./model";

const oneLine = (s: string) => s.replace(/\s*[\r\n]+\s*/g, " ").trim();
const cell = (s: string) => oneLine(s).replace(/\|/g, "\\|");
const row = (cells: string[]) => `| ${cells.map(cell).join(" | ")} |`;
const table = (headers: string[], rows: string[][]) =>
  [row(headers), row(headers.map(() => "---")), ...rows.map(row)].join("\n");

function block(b: LeafBlock): string | null {
  switch (b.type) {
    case "text":
      return b.text;
    case "callout":
      return b.text
        .split(/\r?\n/)
        .map((l) => `> ${l}`.trimEnd())
        .join("\n");
    case "list":
      return b.items.length
        ? b.items.map((i) => `- ${oneLine(i)}`).join("\n")
        : null;
    case "checklist":
      return b.items.length
        ? b.items
            .map(
              (i) =>
                `- [${i.done ? "x" : " "}] ${oneLine(i.text)}${i.note ? ` (${oneLine(i.note)})` : ""}`,
            )
            .join("\n")
        : null;
    case "table":
      return b.headers.length ? table(b.headers, b.rows) : null;
    case "decisions":
      return b.items.length
        ? b.items
            .map(
              (d, i) => `${i + 1}. **${oneLine(d.label)}** ${oneLine(d.text)}`,
            )
            .join("\n")
        : null;
    default:
      return null;
  }
}

function itemLines(label: string, items: ExportItem[]): string[] {
  if (!items.length) return [];
  return [
    `  - ${label}`,
    ...items.map((i) => `    - [${i.done ? "x" : " "}] ${oneLine(i.text)}`),
  ];
}

function taskLines(t: ExportTask): string[] {
  const meta = [
    t.assignee,
    t.sprint,
    t.dueOn ? `até ${formatDate(t.dueOn)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const lines = [
    `- [${t.status === "done" ? "x" : " "}] ${oneLine(t.title)}${meta ? ` — ${meta}` : ""}`,
  ];
  if (t.description) lines.push(`  ${oneLine(t.description)}`);
  return [
    ...lines,
    ...itemLines("Escopo", t.scope),
    ...itemLines("Testes", t.tests),
  ];
}

function projectMd(p: ExportProject, level: number): string {
  const h = (n: number, text: string) =>
    `${"#".repeat(Math.min(n, 6))} ${text}`;
  const { project } = p;
  const out: string[] = [
    h(level, `${project.number} · ${oneLine(project.title)}`),
    `**Status:** ${oneLine(project.status_label)}`,
  ];
  if (project.summary) out.push(project.summary);
  const facts = factsOf(project);
  if (facts.length)
    out.push(
      facts
        .map((f) => `- **${oneLine(f.label)}:** ${oneLine(f.value)}`)
        .join("\n"),
    );
  if (p.team.length) {
    out.push(
      h(level + 1, "Equipe"),
      p.team
        .map(
          (m) =>
            `- ${oneLine(m.name)}${memberRoles(m) ? ` — ${memberRoles(m)}` : ""}${m.isLead ? " (frente)" : ""}`,
        )
        .join("\n"),
    );
  }
  for (const s of project.sections ?? []) {
    const body = (s.blocks ?? [])
      .map(block)
      .filter((x): x is string => x !== null);
    if (s.title) out.push(h(level + 1, oneLine(s.title)));
    out.push(...body);
  }
  if (p.tasks.length) {
    out.push(
      h(level + 1, `Tarefas (${p.progress.done}/${p.progress.total} feitas)`),
    );
    for (const g of groupTasks(p.tasks)) {
      out.push(
        h(level + 2, g.label),
        g.tasks.map((t) => taskLines(t).join("\n")).join("\n"),
      );
    }
  }
  return out.join("\n\n");
}

export function toMarkdown(doc: ExportDoc): string {
  const date = doc.generatedAt ? formatDate(doc.generatedAt) : "";
  const out: string[] = [];
  if (doc.all) {
    out.push(`# LASETE · ${oneLine(doc.title)}`);
    if (date) out.push(`Gerado em ${date}`);
    if (doc.projects.length) {
      out.push(
        table(
          ["Nº", "Projeto", "Frente", "Status", "Tarefas feitas"],
          doc.projects.map((p) => [
            p.project.number,
            p.project.title,
            leadName(p),
            p.project.status_label,
            `${p.progress.done}/${p.progress.total}`,
          ]),
        ),
      );
    }
    for (const p of doc.projects) out.push(projectMd(p, 2));
  } else {
    for (const p of doc.projects) out.push(projectMd(p, 1));
    out.push(`LASETE${date ? ` · gerado em ${date}` : ""}`);
  }
  return out.join("\n\n") + "\n";
}
