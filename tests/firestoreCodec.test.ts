import { describe, expect, it } from 'vitest'
import { decodeFromFirestore, encodeForFirestore } from '@/lib/firestoreCodec'
import { hasNestedArray } from './helpers/nested'
import type { Section } from '@/lib/types'

const roundTrip = <T,>(v: T) => decodeFromFirestore(encodeForFirestore(v))

describe('firestoreCodec', () => {
  it('ida e volta de seções com uma tabela de várias linhas', () => {
    const sections: Section[] = [
      {
        title: 'Dados',
        blocks: [
          { type: 'table', headers: ['A', 'B'], rows: [['1', '2'], ['3', '4'], ['5', '6']] },
        ],
      },
    ]
    const encoded = encodeForFirestore(sections)
    expect(hasNestedArray(encoded)).toBe(false)
    expect(roundTrip(sections)).toEqual(sections)
  })

  it('tabela vazia', () => {
    const t = { type: 'table', headers: [], rows: [] }
    expect(encodeForFirestore(t)).toEqual(t)
    expect(roundTrip(t)).toEqual(t)
  })

  it('linha com uma célula vazia', () => {
    const t = { type: 'table', headers: ['A'], rows: [[''], ['x']] }
    expect(hasNestedArray(encodeForFirestore(t))).toBe(false)
    expect(roundTrip(t)).toEqual(t)
  })

  it('profundidade 3', () => {
    const v = { a: [[['x', 'y'], []], [[]]] }
    expect(hasNestedArray(encodeForFirestore(v))).toBe(false)
    expect(roundTrip(v)).toEqual(v)
  })

  it('valor sem arrays aninhados fica estruturalmente igual', () => {
    const v = { s: 'a', n: 1, b: true, z: null, list: [1, 2, { k: ['x'] }], o: { p: {} } }
    expect(encodeForFirestore(v)).toEqual(v)
    expect(decodeFromFirestore(v)).toEqual(v)
  })

  it('objeto com __row e outras chaves não é alterado na leitura', () => {
    const v = { __row: ['a'], outra: 1 }
    expect(decodeFromFirestore(v)).toEqual(v)
  })

  it('não altera o valor de entrada', () => {
    const v = { rows: [['a']] }
    encodeForFirestore(v)
    expect(v).toEqual({ rows: [['a']] })
  })
})
