import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useData } from '@/data/DataProvider'
import { Field, NativeSelect } from '@/edit/fields'
import { FormDialog } from '@/edit/FormDialog'
import { fromDrafts, SectionsEditor, toDrafts } from '@/edit/SectionsEditor'
import { TeamEditor } from '@/edit/TeamEditor'
import type { TeamRow } from '@/edit/TeamEditor'
import { nextPosition, orNull } from '@/edit/util'
import { save, setProjectTeam } from '@/lib/api'
import type { Fact, Project, ProjectKind, StatusLevel } from '@/lib/types'

const KIND_LABEL: Record<ProjectKind, string> = { projeto: 'Projeto', colaboracao: 'Colaboração', gadget: 'Gadget' }
const LEVEL_LABEL: Record<StatusLevel, string> = { on: 'Ativo', half: 'Parcial', off: 'Parado' }

interface Props {
  project?: Project
  onClose: () => void
  /** Chamado com o id do projeto salvo. */
  onSaved?: (id: string) => void
}

export function ProjectForm({ project, onClose, onSaved }: Props) {
  const { projects, people, members, reload } = useData()
  const [number, setNumber] = useState(project?.number ?? String(nextPosition(projects) + 1).padStart(2, '0'))
  const [title, setTitle] = useState(project?.title ?? '')
  const [kind, setKind] = useState<ProjectKind>(project?.kind ?? 'projeto')
  const [level, setLevel] = useState<StatusLevel>(project?.status_level ?? 'on')
  const [label, setLabel] = useState(project?.status_label ?? '')
  const [summary, setSummary] = useState(project?.summary ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [facts, setFacts] = useState<Fact[]>(project?.facts ?? [])
  const [team, setTeam] = useState<TeamRow[]>(
    project
      ? members
          .filter((m) => m.project_id === project.id)
          .map((m) => ({ person_id: m.person_id, role: m.role ?? '', is_lead: m.is_lead }))
      : [],
  )
  const [sections, setSections] = useState(() => toDrafts(project?.sections ?? []))

  // Projeto novo já gravado: a nova tentativa atualiza em vez de inserir de novo.
  const savedId = useRef<string | null>(null)

  const patchFact = (i: number, p: Partial<Fact>) => setFacts(facts.map((f, j) => (j === i ? { ...f, ...p } : f)))

  async function submit() {
    if (!title.trim()) throw new Error('Informe o título.')
    if (!number.trim()) throw new Error('Informe o número.')
    if (team.some((r) => !r.person_id)) throw new Error('Escolha a pessoa em cada linha da equipe.')

    const existingId = project?.id ?? savedId.current
    const saved = await save('projects', {
      ...(existingId ? { id: existingId } : { position: nextPosition(projects) }),
      number: number.trim(),
      title: title.trim(),
      kind,
      status_level: level,
      status_label: label.trim() || LEVEL_LABEL[level],
      summary: orNull(summary),
      deadline: orNull(deadline),
      facts: facts
        .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
        .filter((f) => f.label || f.value),
      sections: fromDrafts(sections),
    })
    const id = existingId ?? saved.id
    savedId.current = id
    await setProjectTeam(
      id,
      team.map((r) => ({ person_id: r.person_id, role: orNull(r.role), is_lead: r.is_lead })),
    )
    await reload()
    onSaved?.(id)
  }

  return (
    <FormDialog title={project ? 'Editar projeto' : 'Novo projeto'} onSubmit={submit} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
        <Field label="Número">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono" />
        </Field>
        <Field label="Título">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tipo">
          <NativeSelect value={kind} onChange={(e) => setKind(e.target.value as ProjectKind)}>
            {(Object.keys(KIND_LABEL) as ProjectKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Nível do status">
          <NativeSelect value={level} onChange={(e) => setLevel(e.target.value as StatusLevel)}>
            {(Object.keys(LEVEL_LABEL) as StatusLevel[]).map((l) => (
              <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Rótulo do status">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={LEVEL_LABEL[level]} />
        </Field>
      </div>
      <Field label="Resumo">
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
      </Field>
      <Field label="Prazo">
        <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Ex.: dez/2026" />
      </Field>

      <section aria-label="Fatos" className="grid gap-2">
        <h3 className="font-mono text-[11px] tracking-wider text-label uppercase">Fatos</h3>
        {facts.map((f, i) => (
          <div key={i} className="flex gap-2">
            <Input aria-label={`Rótulo do fato ${i + 1}`} placeholder="Rótulo" value={f.label} onChange={(e) => patchFact(i, { label: e.target.value })} />
            <Input aria-label={`Valor do fato ${i + 1}`} placeholder="Valor" value={f.value} onChange={(e) => patchFact(i, { value: e.target.value })} />
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover fato ${i + 1}`} onClick={() => setFacts(facts.filter((_, j) => j !== i))}>
              Remover
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setFacts([...facts, { label: '', value: '' }])}>
            Adicionar fato
          </Button>
        </div>
      </section>

      <section aria-label="Equipe" className="grid gap-2">
        <h3 className="font-mono text-[11px] tracking-wider text-label uppercase">Equipe</h3>
        <TeamEditor people={people} value={team} onChange={setTeam} />
      </section>

      <section aria-label="Seções" className="grid gap-2">
        <h3 className="font-mono text-[11px] tracking-wider text-label uppercase">Seções</h3>
        <SectionsEditor value={sections} onChange={setSections} />
      </section>
    </FormDialog>
  )
}
