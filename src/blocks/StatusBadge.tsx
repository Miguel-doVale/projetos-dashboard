import type { StatusLevel } from '@/lib/types'

const SQUARE: Record<StatusLevel, string> = {
  on: 'bg-accent border-accent',
  half: 'border-accent bg-[linear-gradient(90deg,var(--accent)_50%,transparent_50%)]',
  off: 'border-accent bg-transparent',
}

export function StatusBadge({ level, label }: { level: StatusLevel; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted">
      <span aria-hidden="true" data-level={level} className={`size-[9px] shrink-0 border ${SQUARE[level]}`} />
      {label}
    </span>
  )
}
