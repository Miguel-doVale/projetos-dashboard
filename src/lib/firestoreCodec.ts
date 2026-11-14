// O Firestore não aceita array dentro de array. Na gravação, todo array que está
// diretamente dentro de outro vira `{ __row: [...] }`; na leitura, volta ao que era.
const ROW = '__row'

const isPlain = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

function encode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (Array.isArray(item) ? { [ROW]: encode(item) } : encode(item)))
  }
  if (isPlain(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]))
  }
  return value
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode)
  if (isPlain(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && keys[0] === ROW && Array.isArray(value[ROW])) {
      return decode(value[ROW])
    }
    return Object.fromEntries(keys.map((k) => [k, decode(value[k])]))
  }
  return value
}

export function encodeForFirestore<T>(data: T): T {
  return encode(data) as T
}

export function decodeFromFirestore<T>(data: T): T {
  return decode(data) as T
}
