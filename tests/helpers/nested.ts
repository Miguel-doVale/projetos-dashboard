/** Verdadeiro se há um array diretamente dentro de outro (o Firestore não aceita). */
export function hasNestedArray(v: unknown, inArray = false): boolean {
  if (Array.isArray(v)) return inArray || v.some((x) => hasNestedArray(x, true))
  if (typeof v === 'object' && v !== null) return Object.values(v).some((x) => hasNestedArray(x, false))
  return false
}
