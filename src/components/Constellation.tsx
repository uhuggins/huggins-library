import { useMemo, useState } from 'react'
import { genreColor, genresBySize, NEUTRAL_GENRE, type Book } from '../lib/collection'
import { layoutGraph, type GraphLink, type GraphNode } from '../lib/constellation'

const W = 1000
const H = 740

interface Props {
  onOpen: (book: Book) => void
}

interface Tip {
  x: number
  y: number
  head: string
  body: string
}

export default function Constellation({ onOpen }: Props) {
  const { nodes, links } = useMemo(() => layoutGraph(W, H), [])
  const [hovered, setHovered] = useState<string | null>(null)
  const [tip, setTip] = useState<Tip | null>(null)

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const add = (a: string, b: string) => {
      if (!map.has(a)) map.set(a, new Set())
      map.get(a)!.add(b)
    }
    for (const l of links) {
      add(l.source, l.target)
      add(l.target, l.source)
    }
    return map
  }, [links])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const isDim = (id: string) => hovered !== null && id !== hovered && !neighbors.get(hovered)?.has(id)
  const linkDim = (l: GraphLink) => hovered !== null && l.source !== hovered && l.target !== hovered

  const enter = (n: GraphNode) => {
    setHovered(n.id)
    if (n.kind === 'book' && n.book) {
      setTip({ x: n.x, y: n.y, head: n.book.title, body: `${n.book.author} · ${n.book.genre}` })
    } else {
      setTip({ x: n.x, y: n.y, head: n.label, body: n.kind === 'genre' ? 'section' : 'a thread through the shelves' })
    }
  }
  const leave = () => {
    setHovered(null)
    setTip(null)
  }

  const nodeColor = (n: GraphNode) => (n.genre ? genreColor(n.genre) : NEUTRAL_GENRE)

  return (
    <section id="constellation" aria-label="The constellation">
      <header className="section-head" data-reveal>
        <h2>The constellation</h2>
        <p>
          Every book a star, pulled into orbit around its section. Gold lines join books by the same hand; dotted lines
          follow threads like Ireland, Cambridge, and fishing across genres.
        </p>
      </header>

      <div className="sky-wrap">
        <svg
          className="sky"
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label="Network graph of the library. Each book links to its genre, to shared writers, and to cross-genre threads. The same data is in the ledger table."
        >
          <g>
            {links.map((l, i) => {
              const a = byId.get(l.source)!
              const b = byId.get(l.target)!
              return (
                <line
                  key={i}
                  className={`edge edge-${l.kind} ${linkDim(l) ? 'dim' : ''}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                />
              )
            })}
          </g>
          <g>
            {nodes.map((n) => {
              if (n.kind === 'book') {
                const r = n.book!.spine.kind === 'hardback' ? 6 : 4.5
                return (
                  <g key={n.id} onMouseEnter={() => enter(n)} onMouseLeave={leave}>
                    <circle
                      className={`star ${isDim(n.id) ? 'dim' : ''} ${hovered === n.id ? 'lit' : ''}`}
                      cx={n.x}
                      cy={n.y}
                      r={hovered === n.id ? r + 2 : r}
                      fill={nodeColor(n)}
                    />
                    <circle
                      className="star-hit"
                      cx={n.x}
                      cy={n.y}
                      r={13}
                      fill="transparent"
                      tabIndex={0}
                      role="button"
                      aria-label={`${n.book!.title}, ${n.book!.author}. Opens the book record.`}
                      onFocus={() => enter(n)}
                      onBlur={leave}
                      onClick={() => onOpen(n.book!)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpen(n.book!)
                        }
                      }}
                    />
                  </g>
                )
              }
              const isGenre = n.kind === 'genre'
              return (
                <g
                  key={n.id}
                  className={`hub ${isDim(n.id) ? 'dim' : ''}`}
                  onMouseEnter={() => enter(n)}
                  onMouseLeave={leave}
                >
                  {isGenre ? (
                    <rect x={n.x - 3.4} y={n.y - 3.4} width={6.8} height={6.8} transform={`rotate(45 ${n.x} ${n.y})`} fill={nodeColor(n)} />
                  ) : (
                    <circle cx={n.x} cy={n.y} r={3.6} className="thread-dot" />
                  )}
                  <text x={n.x} y={n.y - 9} className={isGenre ? 'hub-label' : 'thread-label'} textAnchor="middle">
                    {isGenre ? n.label : n.label.toUpperCase()}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
        {tip && (
          <div className="chart-tip sky-tip" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }} role="status">
            <strong>{tip.head}</strong>
            <span>{tip.body}</span>
          </div>
        )}
      </div>

      <div className="sky-legend">
        <ul className="legend-genres" aria-label="Genre colors">
          {genresBySize.slice(0, 8).map((g) => (
            <li key={g}>
              <span className="swatch" style={{ background: genreColor(g) }} aria-hidden="true" />
              {g}
            </li>
          ))}
          <li>
            <span className="swatch" style={{ background: NEUTRAL_GENRE }} aria-hidden="true" />
            smaller sections
          </li>
        </ul>
        <ul className="legend-edges" aria-label="Line meanings">
          <li>
            <span className="edge-sample author" aria-hidden="true" /> same writer
          </li>
          <li>
            <span className="edge-sample thread" aria-hidden="true" /> shared thread
          </li>
          <li>
            <span className="edge-sample genre" aria-hidden="true" /> shelved section
          </li>
        </ul>
      </div>
    </section>
  )
}
