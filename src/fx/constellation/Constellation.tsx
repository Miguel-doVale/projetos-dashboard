import { useEffect, useMemo, useRef, useState } from 'react'
import { canUseWebGL } from '@/fx/canUseWebGL'
import { ConstellationFallback, ConstellationLegend, ConstellationSvg, ProjectLinks } from '@/fx/constellation/ConstellationFallback'
import { buildGraph } from '@/fx/constellation/graph'
import type { ConstellationScene } from '@/fx/constellation/ConstellationScene'
import { motionEnabled } from '@/lib/motion'
import type { Project, ProjectMember } from '@/lib/types'

interface Props {
  projects: Project[]
  members: ProjectMember[]
  onOpen: (id: string) => void
}

/** Mouse de verdade (e não toque): o rótulo do ponto mais próximo aparece sozinho. */
function hasFinePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function SceneView({ graph, onOpen, onFail }: { graph: ReturnType<typeof buildGraph>; onOpen: (id: string) => void; onFail: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const label = useRef<HTMLDivElement>(null)
  const scene = useRef<ConstellationScene | null>(null)
  const [hover, setHover] = useState(false)
  const [labelId, setLabelId] = useState<string | null>(null)
  const lastPointer = useRef<string>('mouse')
  const touched = useRef<string | null>(null) // ponto já tocado uma vez: o segundo toque abre
  const [ready, setReady] = useState(false)
  const graphRef = useRef(graph)
  graphRef.current = graph
  const failRef = useRef(onFail)
  failRef.current = onFail

  useEffect(() => {
    let cancelled = false
    let mounted: ConstellationScene | null = null
    import('@/fx/constellation/ConstellationScene')
      .then(({ ConstellationScene }) => {
        if (cancelled || !canvas.current) return
        mounted = new ConstellationScene()
        mounted.mount(canvas.current)
        mounted.onLabelMove = (pt) => {
          const el = label.current
          if (!el) return
          el.style.opacity = pt ? '1' : '0'
          if (pt) {
            el.style.transform = `translate(${pt.x}px, ${pt.y}px)`
            setLabelId(pt.id)
          }
        }
        mounted.setAutoLabel(hasFinePointer())
        mounted.setGraph(graphRef.current)
        scene.current = mounted
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) failRef.current()
      })
    return () => {
      cancelled = true
      mounted?.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => {
    scene.current?.setGraph(graph)
  }, [graph])

  const local = (e: React.PointerEvent | React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }
  }

  const labelNode = labelId ? graph.nodes.find((n) => n.id === labelId) : undefined

  return (
    <div>
      <div className="relative h-[300px] w-full sm:h-[420px]">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Constelação dos projetos"
          className={`absolute inset-0 h-full w-full touch-pan-y ${hover ? 'cursor-pointer' : ''}`}
          onPointerDown={(e) => {
            lastPointer.current = e.pointerType
          }}
          onPointerMove={(e) => {
            const p = local(e)
            scene.current?.setPointer((p.x / p.w) * 2 - 1, (p.y / p.h) * 2 - 1)
            if (e.pointerType !== 'mouse') return
            const id = scene.current?.pick(p.x, p.y) ?? null
            scene.current?.setHover(id)
            setHover(id !== null)
          }}
          onPointerLeave={(e) => {
            scene.current?.setPointer(0, 0)
            // O toque dispara pointerleave ao soltar o dedo; o rótulo tocado deve ficar.
            if (e.pointerType !== 'mouse') return
            scene.current?.setHover(null)
            setHover(false)
          }}
          onClick={(e) => {
            const p = local(e)
            const id = scene.current?.pick(p.x, p.y) ?? null
            if (lastPointer.current === 'mouse') {
              if (id) onOpen(id)
              return
            }
            // Toque: o primeiro mostra o rótulo, o segundo no mesmo ponto abre.
            if (id && id === touched.current) onOpen(id)
            else {
              touched.current = id
              scene.current?.setHover(id)
              if (!id) setLabelId(null)
            }
          }}
        />
        {!ready && (
          <div className="absolute inset-0">
            <ConstellationSvg graph={graph} onOpen={onOpen} />
          </div>
        )}
        <div
          ref={label}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 opacity-0"
          style={{ transition: 'opacity 120ms' }}
        >
          <span className="-translate-x-1/2 -translate-y-[calc(100%+14px)] inline-block rounded-md border border-border bg-surface-raised px-2 py-1 font-mono text-[11px] whitespace-nowrap text-foreground">
            {labelNode ? `${labelNode.number} ${labelNode.title}` : ''}
          </span>
        </div>
      </div>
      <ConstellationLegend />
      <ProjectLinks graph={graph} />
    </div>
  )
}

export default function Constellation({ projects, members, onOpen }: Props) {
  const graph = useMemo(() => buildGraph(projects, members), [projects, members])
  const [failed, setFailed] = useState(false)
  const [live] = useState(() => canUseWebGL() && motionEnabled())
  if (graph.nodes.length === 0) return null
  if (!live || failed) return <ConstellationFallback graph={graph} onOpen={onOpen} />
  return <SceneView graph={graph} onOpen={onOpen} onFail={() => setFailed(true)} />
}
