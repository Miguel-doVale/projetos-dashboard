let cached: boolean | null = null

/**
 * WebGL disponível neste ambiente? Em jsdom (sem WebGLRenderingContext) é sempre falso.
 * O contexto de teste é solto na hora e o resultado fica em cache, para não gastar contextos do navegador.
 */
export function canUseWebGL(): boolean {
  if (cached !== null) return cached
  if (typeof window === 'undefined' || typeof window.WebGLRenderingContext === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    cached = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}
