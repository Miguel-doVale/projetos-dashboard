import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface ItemRow {
  key: number
  /** Presente quando o item já existe no banco. */
  id?: string
  text: string
  /** Criado por Enter: recebe o foco ao aparecer. */
  fresh?: boolean
}

let counter = 0
export const newItemRow = (text = '', id?: string, fresh = false): ItemRow => ({ key: ++counter, id, text, fresh })

interface Props {
  label: string
  value: ItemRow[]
  onChange: (next: ItemRow[]) => void
}

export function ItemsEditor({ label, value, onChange }: Props) {
  return (
    <section aria-label={label} className="grid gap-2">
      <h3 className="font-mono text-[11px] tracking-wider text-label uppercase">{label}</h3>
      {value.map((row, i) => (
        <div key={row.key} className="flex gap-2">
          <Input
            aria-label={`${label}: item ${i + 1}`}
            value={row.text}
            autoFocus={row.fresh}
            onChange={(e) => onChange(value.map((r) => (r.key === row.key ? { ...r, text: e.target.value } : r)))}
            onKeyDown={(e) => {
              // Enter acrescenta o próximo item em vez de enviar o formulário.
              if (e.key === 'Enter') {
                e.preventDefault()
                if (row.text.trim()) onChange([...value.slice(0, i + 1), newItemRow('', undefined, true), ...value.slice(i + 1)])
              }
            }}
          />
          <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${label.toLowerCase()}: item ${i + 1}`} onClick={() => onChange(value.filter((r) => r.key !== row.key))}>
            Remover
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, newItemRow()])}>
          Adicionar item de {label.toLowerCase()}
        </Button>
      </div>
    </section>
  )
}
