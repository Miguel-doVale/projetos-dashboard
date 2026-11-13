/** Campo opcional vazio vira `null`: o Firestore rejeita `undefined`. */
export const orNull = (value: string): string | null => value.trim() || null

/** Próxima `position` de um grupo: maior existente + 1, ou 0 para o primeiro. */
export function nextPosition(rows: { position: number }[]): number {
  return rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.position)) + 1
}

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Não foi possível salvar. Tente de novo.')
