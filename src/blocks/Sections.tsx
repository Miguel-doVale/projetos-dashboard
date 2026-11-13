import type { ReactNode } from 'react'
import type { LeafBlock, Section } from '@/lib/types'

/** Rótulo de seção de página: número mono em `label` + título grande. */
export function SectionHeading({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div data-reveal className="mb-6 flex items-baseline gap-3">
      {index && <span className="font-mono text-xs tracking-widest text-label">{index}</span>}
      <h2 className="text-[26px] leading-tight font-[650] tracking-tight text-foreground">{children}</h2>
    </div>
  )
}

function Block({ block }: { block: LeafBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm leading-relaxed text-foreground/90">{block.text}</p>
    case 'callout':
      return (
        <p className="border-l-2 border-accent bg-surface-raised py-2 pr-3 pl-4 text-sm leading-relaxed text-foreground/90">
          {block.text}
        </p>
      )
    case 'list':
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90 marker:text-muted">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'checklist':
      return (
        <ul className="space-y-2 text-sm leading-relaxed">
          {block.items.map((item, i) => (
            <li key={i} data-done={item.done ? 'true' : 'false'} className="flex gap-2.5 data-[done=true]:text-muted">
              <span
                aria-hidden="true"
                className={`mt-1 size-3 shrink-0 rounded-[3px] border ${item.done ? 'border-accent bg-accent' : 'border-border'}`}
              />
              <span className={item.done ? 'line-through decoration-muted/60' : 'text-foreground/90'}>
                {item.text}
                {item.note && <span className="ml-2 text-muted">{item.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 font-mono text-[11px] font-normal tracking-wider text-label uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-border last:border-b-0">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top text-foreground/90">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'decisions':
      return (
        <dl className="space-y-2.5 text-sm leading-relaxed">
          {block.items.map((item, i) => (
            <div key={i} className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
              <dt className="shrink-0 font-medium text-foreground sm:w-28">{item.label}</dt>
              <dd className="text-foreground/80">{item.text}</dd>
            </div>
          ))}
        </dl>
      )
    default:
      // Tipo desconhecido (dados mais novos que o app): ignora sem quebrar a tela.
      return null
  }
}

export function Sections({ sections }: { sections: Section[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[720px]:grid-cols-2">
      {(sections ?? []).map((section, i) => (
        <section
          key={i}
          data-reveal
          className={`min-w-0 space-y-4 rounded-xl border border-border bg-surface-raised p-5 ${section.full ? 'min-[720px]:col-span-2' : ''}`}
        >
          {section.title && (
            <h3 className="font-mono text-[11px] font-normal tracking-widest text-label uppercase">{section.title}</h3>
          )}
          {(section.blocks ?? []).map((block, j) => (
            <Block key={j} block={block} />
          ))}
        </section>
      ))}
    </div>
  )
}
