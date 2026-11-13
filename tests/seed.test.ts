import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { seedData } from '@/data/seedData'

const read = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf-8')

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

const doc = new DOMParser().parseFromString(read('tests/fixtures/original.html'), 'text/html')
const seed = JSON.stringify(seedData)

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

  it('tem os 6 projetos nos números esperados, em ordem', () => {
    expect(seedData.projects.map((p) => p.number)).toEqual(['01', '02', '03', '04', '+', 'G1'])
    expect(seedData.projects.map((p) => p.position)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('cria as páginas plano e pendencias', () => {
    expect(seedData.pages.map((p) => p.slug)).toEqual(['plano', 'pendencias'])
  })

  it('cria as 5 pessoas, sem login ainda', () => {
    expect(seedData.people.map((p) => p.name)).toEqual([
      'Miguel Vale', 'Nicolas Mesquita', 'Pedro Brasil', 'Gheorghe Marighella', 'Matheus Aguiar',
    ])
    expect(seedData.people.every((p) => p.uid === null)).toBe(true)
  })

  it('cria as 27 tarefas, todas ligadas a um projeto existente', () => {
    expect(seedData.tasks).toHaveLength(27)
    const numbers = new Set(seedData.projects.map((p) => p.number))
    expect(seedData.tasks.every((t) => numbers.has(t.project))).toBe(true)
  })

  it('mantém prazos nulos (como no SQL) e as cinco equipes por referência', () => {
    expect(seedData.projects.filter((p) => p.deadline === null)).toHaveLength(seedData.projects.length)
    expect(seedData.members).toHaveLength(5)
    const names = new Set(seedData.people.map((p) => p.name))
    expect(seedData.members.every((m) => names.has(m.person))).toBe(true)
  })
})
