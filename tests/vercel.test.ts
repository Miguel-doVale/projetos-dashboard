import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface Rule {
  source: string
  headers: { key: string; value: string }[]
}
const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  rewrites: { source: string; destination: string }[]
  headers: Rule[]
}
const header = (source: string, key: string) =>
  config.headers.find((r) => r.source === source)?.headers.find((h) => h.key === key)?.value

describe('vercel.json', () => {
  it('reescreve tudo para /index.html', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
  })

  it('tem os três cabeçalhos', () => {
    expect(header('/(.*)', 'X-Robots-Tag')).toBe('noindex, nofollow')
    expect(header('/index.html', 'Cache-Control')).toBe('no-cache')
    expect(header('/assets/(.*)', 'Cache-Control')).toBe('public, max-age=31536000, immutable')
  })
})
