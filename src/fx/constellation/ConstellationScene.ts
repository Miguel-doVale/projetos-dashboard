import {
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from 'three'
import { fibonacciPoint, LEVEL_COLOR } from '@/fx/constellation/graph'
import type { Graph } from '@/fx/constellation/graph'
import type { StatusLevel } from '@/lib/types'

const RADIUS = 1.7
const CAMERA_Z = 5.4
const SPIN = 0.09 // rad/s
const PICK_RADIUS = 22 // px

export interface LabelPoint {
  x: number
  y: number
  id: string
}

// Anéis orbitais bem discretos (opacidade <= 0.08) que giram em velocidades diferentes.
const RINGS = [
  { radius: 1.25, tilt: 1.15, speed: 0.05, opacity: 0.07 },
  { radius: 1.75, tilt: 0.55, speed: -0.035, opacity: 0.06 },
  { radius: 2.15, tilt: 1.4, speed: 0.022, opacity: 0.05 },
]
const HALO_OPACITY = 0.38
const HALO_SCALE = 7 // diâmetro do halo em múltiplos do raio do ponto
const AUTO_LABEL_MARGIN = 0.15 // o rótulo automático só troca se o novo ponto estiver bem mais perto da câmera

/** Gradiente radial branco para o halo; a cor do status vem do material. */
function haloTexture(): CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new CanvasTexture(canvas)
}

/** Cena Three.js da constelação. Posições vêm só daqui; o grafo é puro (graph.ts). */
export class ConstellationScene {
  /** Chamado a cada quadro com o nó do rótulo (sob o mouse, tocado ou o mais próximo da câmera) ou null. */
  onLabelMove: ((pt: LabelPoint | null) => void) | null = null

  private renderer: WebGLRenderer | null = null
  private canvas: HTMLCanvasElement | null = null
  private scene = new Scene()
  private camera = new PerspectiveCamera(40, 1, 0.1, 50)
  private tilt = new Group() // paralaxe
  private spin = new Group() // rotação contínua
  private nodes = new Map<string, { mesh: Mesh; halo: Sprite | null; base: number; level: StatusLevel }>()
  private haloMaterials = new Map<StatusLevel, SpriteMaterial>()
  private halo: CanvasTexture | null = null
  private rings: { pivot: Group; speed: number; geometry: BufferGeometry; material: LineBasicMaterial }[] = []
  private autoLabel = false
  private autoId: string | null = null
  private nodeMaterials = new Map<StatusLevel, MeshBasicMaterial>()
  private lineMaterials = new Map<number, LineBasicMaterial>()
  private sphere = new SphereGeometry(1, 20, 14)
  private lines: { line: Line; geometry: BufferGeometry }[] = []
  private pointer = { x: 0, y: 0 }
  private eased = { x: 0, y: 0 }
  private hover: string | null = null
  private raf = 0
  private last = 0
  private tabVisible = true
  private inView = true
  private observer: IntersectionObserver | null = null
  private resizer: ResizeObserver | null = null
  private width = 1
  private height = 1
  private tmp = new Vector3()

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(new Color('#000000'), 0)
    this.renderer = renderer
    this.camera.position.set(0, 0, CAMERA_Z)
    this.scene.add(new AmbientLight(0xffffff, 1))
    this.tilt.add(this.spin)
    this.scene.add(this.tilt)
    this.halo = haloTexture()
    this.addRings()
    this.tilt.rotation.x = 0.28

    this.resize()
    this.resizer = new ResizeObserver(() => {
      this.resize()
      this.renderFrame()
    })
    this.resizer.observe(canvas)
    this.observer = new IntersectionObserver((entries) => {
      this.inView = entries[entries.length - 1]?.isIntersecting ?? true
      this.sync()
    })
    this.observer.observe(canvas)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.tabVisible = document.visibilityState !== 'hidden'
    this.sync()
  }

  setGraph(graph: Graph) {
    this.clearGraph()
    const n = graph.nodes.length
    graph.nodes.forEach((node, i) => {
      const [x, y, z] = fibonacciPoint(i, n)
      const base = 0.06 + Math.min(node.size, 8) * 0.016
      const mesh = new Mesh(this.sphere, this.materialFor(node.level))
      mesh.position.set(x * RADIUS, y * RADIUS, z * RADIUS)
      mesh.scale.setScalar(base)
      this.spin.add(mesh)
      const halo = this.halo ? new Sprite(this.haloMaterialFor(node.level)) : null
      if (halo) {
        halo.position.copy(mesh.position)
        halo.scale.setScalar(base * HALO_SCALE)
        halo.renderOrder = -1
        this.spin.add(halo)
      }
      this.nodes.set(node.id, { mesh, halo, base, level: node.level })
    })
    for (const link of graph.links) {
      const a = this.nodes.get(link.a)
      const b = this.nodes.get(link.b)
      if (!a || !b) continue
      const geometry = new BufferGeometry()
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute([...a.mesh.position.toArray(), ...b.mesh.position.toArray()], 3),
      )
      const line = new Line(geometry, this.lineMaterialFor(link.weight))
      this.spin.add(line)
      this.lines.push({ line, geometry })
    }
    this.renderFrame()
  }

  /** x e y em -1..1 (centro = 0). */
  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

  setHover(id: string | null) {
    this.hover = id
    this.nodes.forEach((n, key) => {
      const k = key === id ? 1.5 : 1
      n.mesh.scale.setScalar(n.base * k)
      n.halo?.scale.setScalar(n.base * HALO_SCALE * k)
    })
    if (!id && !this.autoLabel) this.onLabelMove?.(null)
  }

  /** Liga o rótulo do projeto mais próximo da câmera, sem precisar de hover (telas com mouse). */
  setAutoLabel(on: boolean) {
    this.autoLabel = on
    this.autoId = null
    if (!on && !this.hover) this.onLabelMove?.(null)
  }

  /** Nó mais próximo (à frente) dentro de PICK_RADIUS px; x e y em pixels do canvas. */
  pick(x: number, y: number): string | null {
    let best: string | null = null
    let bestScore = Infinity
    this.scene.updateMatrixWorld(true)
    this.nodes.forEach((n, id) => {
      const p = this.project(n.mesh)
      if (!p) return
      const d = Math.hypot(p.x - x, p.y - y)
      if (d > PICK_RADIUS) return
      const score = d + p.depth * 6 // nós da frente (depth menor) vencem empates
      if (score < bestScore) {
        bestScore = score
        best = id
      }
    })
    return best
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.observer?.disconnect()
    this.resizer?.disconnect()
    this.clearGraph()
    this.sphere.dispose()
    this.nodeMaterials.forEach((m) => m.dispose())
    this.lineMaterials.forEach((m) => m.dispose())
    this.haloMaterials.forEach((m) => m.dispose())
    this.halo?.dispose()
    this.halo = null
    for (const ring of this.rings) {
      ring.geometry.dispose()
      ring.material.dispose()
    }
    this.rings = []
    this.nodeMaterials.clear()
    this.lineMaterials.clear()
    this.haloMaterials.clear()
    this.renderer?.dispose()
    this.renderer = null
    this.canvas = null
    this.onLabelMove = null
  }

  private materialFor(level: StatusLevel) {
    let m = this.nodeMaterials.get(level)
    if (!m) {
      m = new MeshBasicMaterial({ color: new Color(LEVEL_COLOR[level]) })
      this.nodeMaterials.set(level, m)
    }
    return m
  }

  private haloMaterialFor(level: StatusLevel) {
    let m = this.haloMaterials.get(level)
    if (!m) {
      m = new SpriteMaterial({
        map: this.halo,
        color: new Color(LEVEL_COLOR[level]),
        transparent: true,
        opacity: HALO_OPACITY,
        depthWrite: false,
        blending: AdditiveBlending,
      })
      this.haloMaterials.set(level, m)
    }
    return m
  }

  /** Anéis finos ao redor do centro; cada um precessa em torno do eixo Y numa velocidade. */
  private addRings() {
    for (const r of RINGS) {
      const points: number[] = []
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * Math.PI * 2
        points.push(Math.cos(a) * r.radius, Math.sin(a) * r.radius, 0)
      }
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
      const material = new LineBasicMaterial({ color: new Color('#9cddbd'), transparent: true, opacity: r.opacity, depthWrite: false })
      const loop = new LineLoop(geometry, material)
      loop.rotation.x = r.tilt
      const pivot = new Group()
      pivot.add(loop)
      this.tilt.add(pivot)
      this.rings.push({ pivot, speed: r.speed, geometry, material })
    }
  }

  private lineMaterialFor(weight: number) {
    let m = this.lineMaterials.get(weight)
    if (!m) {
      m = new LineBasicMaterial({
        color: new Color('#9cddbd'),
        transparent: true,
        opacity: Math.min(0.55, 0.14 + weight * 0.12),
      })
      this.lineMaterials.set(weight, m)
    }
    return m
  }

  private clearGraph() {
    for (const { line, geometry } of this.lines) {
      this.spin.remove(line)
      geometry.dispose()
    }
    this.lines = []
    this.nodes.forEach((n) => {
      this.spin.remove(n.mesh)
      if (n.halo) this.spin.remove(n.halo)
    })
    this.nodes.clear()
  }

  /** Nó mais próximo da câmera; mantém o atual até outro estar bem mais perto, para o rótulo não ficar trocando. */
  private nearest(): string | null {
    let best: string | null = null
    let bestDist = Infinity
    let currentDist = Infinity
    this.nodes.forEach((n, id) => {
      const d = this.tmp.setFromMatrixPosition(n.mesh.matrixWorld).distanceTo(this.camera.position)
      if (id === this.autoId) currentDist = d
      if (d < bestDist) {
        bestDist = d
        best = id
      }
    })
    if (this.autoId && currentDist - bestDist < AUTO_LABEL_MARGIN) return this.autoId
    this.autoId = best
    return best
  }

  private project(mesh: Mesh): { x: number; y: number; depth: number } | null {
    this.tmp.setFromMatrixPosition(mesh.matrixWorld).project(this.camera)
    if (this.tmp.z > 1) return null
    return {
      x: ((this.tmp.x + 1) / 2) * this.width,
      y: ((1 - this.tmp.y) / 2) * this.height,
      depth: this.tmp.z,
    }
  }

  private resize() {
    if (!this.renderer || !this.canvas) return
    const w = Math.max(1, this.canvas.clientWidth)
    const h = Math.max(1, this.canvas.clientHeight)
    this.width = w
    this.height = h
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    // Em telas estreitas afasta a câmera para a esfera inteira caber.
    this.camera.position.z = this.camera.aspect < 1 ? CAMERA_Z / Math.max(0.62, this.camera.aspect) : CAMERA_Z
    this.camera.updateProjectionMatrix()
  }

  private onVisibility = () => {
    this.tabVisible = document.visibilityState !== 'hidden'
    this.sync()
  }

  private sync() {
    const run = this.tabVisible && this.inView && this.renderer !== null
    if (run && !this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.spin.rotation.y += dt * SPIN
    for (const ring of this.rings) ring.pivot.rotation.y += dt * ring.speed
    this.eased.x += (this.pointer.x - this.eased.x) * Math.min(1, dt * 3)
    this.eased.y += (this.pointer.y - this.eased.y) * Math.min(1, dt * 3)
    this.tilt.rotation.y = this.eased.x * 0.35
    this.tilt.rotation.x = 0.28 + this.eased.y * 0.22
    this.renderFrame()
    const labelId = this.hover ?? (this.autoLabel ? this.nearest() : null)
    const n = labelId ? this.nodes.get(labelId) : undefined
    const p = n ? this.project(n.mesh) : null
    if (labelId) this.onLabelMove?.(p ? { x: p.x, y: p.y, id: labelId } : null)
    else if (this.autoLabel) this.onLabelMove?.(null)
    this.raf = requestAnimationFrame(this.tick)
  }

  private renderFrame() {
    if (!this.renderer) return
    this.scene.updateMatrixWorld(true)
    this.renderer.render(this.scene, this.camera)
  }
}
