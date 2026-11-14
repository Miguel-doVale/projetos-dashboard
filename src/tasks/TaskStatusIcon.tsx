import type { Task } from '@/lib/types'
import { TASK_STATUS_LABEL } from '@/lib/derive'

/** Ícone de status legível de relance: círculo vazio (a fazer), meio cheio (fazendo), cheio com check (feito). */
export function TaskStatusIcon({ status }: { status: Task['status'] }) {
  return (
    <span title={TASK_STATUS_LABEL[status]} aria-hidden="true" className="mt-0.5 grid size-4 shrink-0 place-items-center sm:mt-0">
      <svg viewBox="0 0 16 16" className="size-4">
        {status === 'todo' && <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--muted)" strokeWidth="1.5" />}
        {status === 'doing' && (
          <>
            <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
            <path d="M8 3.5a4.5 4.5 0 0 1 0 9z" fill="var(--accent)" />
          </>
        )}
        {status === 'done' && (
          <>
            <circle cx="8" cy="8" r="7" fill="var(--accent)" />
            <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="#000" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </span>
  )
}
