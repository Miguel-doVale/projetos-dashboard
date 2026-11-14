import { Link } from 'react-router'
import { fibonacciPoint, LEVEL_COLOR } from '@/fx/constellation/graph'
import type { Graph } from '@/fx/constellation/graph'
import type { StatusLevel } from '@/lib/types'

const W = 640
const H = 320

/** Lista de links só para leitor de tela e teclado: oculta, e aparece quando um link recebe foco. */
export function ProjectLinks({ graph }: { graph: Graph }) {
  return (
    <nav
      aria-label="Projetos da constelação"
      className="sr-only focus-within:not-sr-only focus-within:mt-3 focus-within:flex focus-within:flex-wrap focus-within:gap-x-4 focus-within:gap-y-1"
    >
      {graph.nodes.map((n) => (
        <Link
          key={n.id}
          to={`/projetos/${n.id}`}
          className="font-mono text-[11px] text-muted transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          {n.number} {n.title}
        </Link>
      ))}
    </nav>
  )
}

/** Legenda das cores e das linhas, abaixo da constelação. */
export function ConstellationLegend() {
  const dot = (level: StatusLevel) => (
    <span aria-hidden="true" style={{ color: LEVEL_COLOR[level] }}>
      ●
    </span>
  )
  return (
    <p data-legend className="mt-3 font-mono text-[11px] text-muted">
      {dot('on')} em andamento {dot('half')} fase inicial {dot('off')} a definir · linhas = pessoas em comum
    </p>
  )
}

/** Pontos e linhas em SVG, sem a lista de links. */
export function ConstellationSvg({ graph, onOpen }: { graph: Graph; onOpen: (id: string) => void }) {
  const n = graph.nodes.length
  const pos = new Map(
    graph.nodes.map((node, i) => {
      const [x, y, z] = fibonacciPoint(i, n)
      const tilt = 0.45
      const yy = y * Math.cos(tilt) - z * Math.sin(tilt)
      return [node.id, { x: W / 2 + x * W * 0.36, y: H / 2 + yy * H * 0.38 }] as const
    }),
  )
  return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Constelação dos projetos"
        className="h-[300px] w-full sm:h-[420px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {graph.links.map((l) => {
          const a = pos.get(l.a)!
          const b = pos.get(l.b)!
          return (
            <line
              key={`${l.a}-${l.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#9cddbd"
              strokeOpacity={Math.min(0.5, 0.12 + l.weight * 0.1)}
              strokeWidth={1}
            />
          )
        })}
        {graph.nodes.map((node) => {
          const p = pos.get(node.id)!
          return (
            <circle
              key={node.id}
              data-project={node.id}
              cx={p.x}
              cy={p.y}
              r={4 + Math.min(node.size, 6) * 1.2}
              fill={LEVEL_COLOR[node.level]}
              className="cursor-pointer"
              onClick={() => onOpen(node.id)}
            >
              <title>{`${node.number} ${node.title}`}</title>
            </circle>
          )
        })}
      </svg>
  )
}

/** Versão estática: sem WebGL, com movimento reduzido ou enquanto a cena carrega. */
export function ConstellationFallback({ graph, onOpen }: { graph: Graph; onOpen: (id: string) => void }) {
  return (
    <div>
      <ConstellationSvg graph={graph} onOpen={onOpen} />
      <ConstellationLegend />
      <ProjectLinks graph={graph} />
    </div>
  )
}
