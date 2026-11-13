import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf-8')

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

const doc = new DOMParser().parseFromString(read('tests/fixtures/original.html'), 'text/html')
// O seed é SQL: aspas simples escapadas como ''.
const seed = read('supabase/seed.sql').replace(/''/g, "'")

/** Textos de um <li>: cada <small>/<b> separado (o <b> sem os dois-pontos) e o resto. */
function liPieces(li: Element): string[] {
  const pieces: string[] = []
  const rest = li.cloneNode(true) as Element
  for (const el of Array.from(rest.querySelectorAll('small, b'))) {
    const text = norm(el.textContent ?? '').replace(/:$/, '')
    if (text) pieces.push(text)
    el.remove()
  }
  const main = norm(rest.textContent ?? '')
  if (main) pieces.push(main)
  return pieces
}

function expectedTexts(): string[] {
  const texts = [
    ...Array.from(doc.querySelectorAll('li')).flatMap(liPieces),
    ...Array.from(doc.querySelectorAll('td, h3, .callout')).map((el) => norm(el.textContent ?? '')),
  ]
  return [...new Set(texts.filter(Boolean))]
}

describe('seed.sql cobre o levantamento original', () => {
  const texts = expectedTexts()

  it('extrai uma quantidade plausível de textos do HTML', () => {
    expect(texts.length).toBeGreaterThan(100)
  })

  it.each(texts)('contém: %s', (text) => {
    expect(seed).toContain(text)
  })

  it('insere os 6 projetos nos números esperados, em ordem', () => {
    const inserts = seed.match(/insert into (public\.)?projects\b/gi) ?? []
    expect(inserts).toHaveLength(1)
    const block = seed.slice(seed.search(/insert into (public\.)?projects\b/i))
    const numbers = [...block.matchAll(/^\s*\(\d+, '([^']+)', /gm)].map((m) => m[1])
    expect(numbers.slice(0, 6)).toEqual(['01', '02', '03', '04', '+', 'G1'])
  })

  it('cria as páginas plano e pendencias', () => {
    expect(seed).toMatch(/'plano'/)
    expect(seed).toMatch(/'pendencias'/)
    expect((seed.match(/insert into (public\.)?pages\b/gi) ?? []).length).toBe(1)
  })

  it('cria as 5 pessoas', () => {
    const block = seed.slice(seed.search(/insert into (public\.)?people\b/i))
    const names = ['Miguel Vale', 'Nicolas Mesquita', 'Pedro Brasil', 'Gheorghe Marighella', 'Matheus Aguiar']
    for (const name of names) expect(block).toContain(`'${name}'`)
  })
})
