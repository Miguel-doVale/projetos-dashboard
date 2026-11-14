import { useMemo } from 'react'
import type { PointerEvent } from 'react'
import { motionEnabled } from '@/lib/motion'

const MAX_TILT = 3 // graus

function finePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/**
 * Brilho radial que segue o cursor (`--mx`/`--my`) e inclinação de até 3° (`--rx`/`--ry`),
 * só com mouse e sem movimento reduzido. Use com a classe `fx-card` (ver index.css), que lê as variáveis.
 * `tilt: false` mantém só o brilho (para cards dentro de contêineres com `overflow-hidden`).
 */
export function usePointerGlow({ tilt = true }: { tilt?: boolean } = {}) {
  return useMemo(
    () => ({
      // Marca os cards inclinados para o CSS; sem movimento nada é aplicado.
      'data-fx-tilt': tilt && motionEnabled() ? '' : undefined,
      onPointerMove(e: PointerEvent<HTMLElement>) {
        if (e.pointerType === 'touch' || !motionEnabled() || !finePointer()) return
        const el = e.currentTarget
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        el.removeAttribute('data-fx-rest')
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
        el.style.setProperty('--glow', '1')
        if (tilt) {
          el.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`)
          el.style.setProperty('--rx', `${((0.5 - py) * 2 * MAX_TILT).toFixed(2)}deg`)
        }
      },
      onPointerLeave(e: PointerEvent<HTMLElement>) {
        const el = e.currentTarget
        el.setAttribute('data-fx-rest', '')
        el.style.setProperty('--glow', '0')
        el.style.setProperty('--rx', '0deg')
        el.style.setProperty('--ry', '0deg')
      },
    }),
    [tilt],
  )
}
