import { motion } from 'motion/react'
import { motionEnabled } from '@/lib/motion'

interface Props {
  children: string
  as?: 'h1' | 'h2'
  className?: string
}

/** Título que entra por palavra: cada uma sobe de baixo de uma máscara, 40 ms uma depois da outra. O texto continua inteiro no DOM. */
export function SplitTitle({ children, as = 'h1', className }: Props) {
  const animate = motionEnabled()
  const Tag = as
  const words = children.split(' ')
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={i}>
          <span className="inline-block overflow-hidden pb-[0.15em] align-bottom -mb-[0.15em]">
            <motion.span
              className="inline-block"
              initial={animate ? { y: '0.4em', opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
