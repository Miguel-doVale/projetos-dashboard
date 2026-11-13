import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from '@/App'

const read = (file: string) => readFileSync(resolve(__dirname, '..', file), 'utf-8')

describe('base do projeto', () => {
  it('renderiza <App /> dentro de um MemoryRouter sem lançar erro', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>,
      ),
    ).not.toThrow()
  })

  it('src/index.css contém o tema e a fonte local', () => {
    const css = read('src/index.css')
    expect(css).toContain('#9cddbd')
    expect(css).toContain('#0a0e0c')
    expect(css).toContain('geist-latin-wght-normal.woff2')
  })

  it('index.html é pt-BR e noindex', () => {
    const html = read('index.html')
    expect(html).toContain('lang="pt-BR"')
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">')
  })
})
