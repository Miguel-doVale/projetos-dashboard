import {
  AmbientLight,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
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
}

/** Cena Three.js da constelação. Posições vêm só daqui; o grafo é puro (graph.ts). */
export class ConstellationScene {
  /** Chamado a cada quadro com a posição do nó sob o mouse (ou null). */
  onLabelMove: ((pt: LabelPoint | null) => void) | null = null

  private renderer: WebGLRenderer | null = null
  private canvas: HTMLCanvasElement | null = null
  private scene = new Scene()
  private camera = new PerspectiveCamera(40, 1, 0.1, 50)
  private tilt = new Group() // paralaxe
  private spin = new Group() // rotação contínua
  private nodes = new Map<string, { mesh: Mesh; base: number; level: StatusLevel }>()
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
      this.nodes.set(node.id, { mesh, base, level: node.level })
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
    this.nodes.forEach((n, key) => n.mesh.scale.setScalar(key === id ? n.base * 1.5 : n.base))
    if (!id) this.onLabelMove?.(null)
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
    this.nodeMaterials.clear()
    this.lineMaterials.clear()
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
    this.nodes.forEach((n) => this.spin.remove(n.mesh))
    this.nodes.clear()
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
    this.eased.x += (this.pointer.x - this.eased.x) * Math.min(1, dt * 3)
    this.eased.y += (this.pointer.y - this.eased.y) * Math.min(1, dt * 3)
    this.tilt.rotation.y = this.eased.x * 0.35
    this.tilt.rotation.x = 0.28 + this.eased.y * 0.22
    this.renderFrame()
    if (this.hover) {
      const n = this.nodes.get(this.hover)
      const p = n ? this.project(n.mesh) : null
      this.onLabelMove?.(p ? { x: p.x, y: p.y } : null)
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  private renderFrame() {
    if (!this.renderer) return
    this.scene.updateMatrixWorld(true)
    this.renderer.render(this.scene, this.camera)
  }
}
