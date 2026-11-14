export interface Dot {
  x: number
  y: number
  vx: number
  vy: number
}

/** Avança um ponto e o faz voltar para dentro dos limites; o sinal da velocidade é definido, não alternado. */
export function stepDot(d: Dot, dt: number, width: number, height: number): void {
  d.x += d.vx * dt
  d.y += d.vy * dt
  if (d.x < 0) d.vx = Math.abs(d.vx)
  else if (d.x > width) d.vx = -Math.abs(d.vx)
  if (d.y < 0) d.vy = Math.abs(d.vy)
  else if (d.y > height) d.vy = -Math.abs(d.vy)
}

/** Depois de a janela encolher, traz para dentro os pontos que ficaram fora. */
export function clampDots(dots: Dot[], width: number, height: number): void {
  for (const d of dots) {
    d.x = Math.min(Math.max(d.x, 0), width)
    d.y = Math.min(Math.max(d.y, 0), height)
  }
}
