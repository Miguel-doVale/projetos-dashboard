import { afterEach, describe, expect, it, vi } from 'vitest'
import { clampDots, stepDot } from '@/fx/dots'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

async function load() {
  vi.resetModules()
  return (await import('@/fx/canUseWebGL')).canUseWebGL
}

describe('canUseWebGL', () => {
  it('solta o contexto de teste e guarda o resultado em cache', async () => {
    vi.stubGlobal('WebGLRenderingContext', class {})
    const loseContext = vi.fn()
    const gl = { getExtension: vi.fn(() => ({ loseContext })) }
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gl as never)
    const canUseWebGL = await load()
    expect(canUseWebGL()).toBe(true)
    expect(canUseWebGL()).toBe(true)
    expect(getContext).toHaveBeenCalledTimes(1)
    expect(gl.getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(loseContext).toHaveBeenCalledTimes(1)
  })
})

describe('dots', () => {
  it('um ponto além da borda direita passa a ir para dentro e não oscila', () => {
    const d = { x: 900, y: 10, vx: 8, vy: 0 }
    stepDot(d, 0.016, 500, 400)
    expect(d.vx).toBeLessThan(0)
    const x = d.x
    stepDot(d, 0.016, 500, 400)
    expect(d.vx).toBeLessThan(0)
    expect(d.x).toBeLessThan(x)
  })
  it('na borda esquerda e superior a velocidade fica positiva', () => {
    const d = { x: -5, y: -5, vx: -8, vy: -8 }
    stepDot(d, 0.016, 500, 400)
    expect(d.vx).toBeGreaterThan(0)
    expect(d.vy).toBeGreaterThan(0)
  })
  it('clampDots traz os pontos para dentro dos limites', () => {
    const dots = [{ x: 900, y: -3, vx: 1, vy: 1 }]
    clampDots(dots, 500, 400)
    expect(dots[0]).toMatchObject({ x: 500, y: 0 })
  })
})
