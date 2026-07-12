// Builds the constellation graph (books, genre hubs, thread hubs) and computes
// a deterministic force-directed layout up front, so the SVG renders static
// positions and React state never updates per animation frame.

import { books, peopleOf, type Book, type Genre } from '../data/books'

export type NodeKind = 'book' | 'genre' | 'thread'
export type LinkKind = 'genre' | 'thread' | 'author'

export interface GraphNode {
  id: string
  kind: NodeKind
  label: string
  book?: Book
  genre?: Genre
  x: number
  y: number
}

export interface GraphLink {
  source: string
  target: string
  kind: LinkKind
}

// Tags that are really a pointer at an existing genre hub.
const TAG_TO_GENRE: Record<string, Genre> = {
  astronomy: 'Astronomy',
  travel: 'Travel',
  bengal: 'Bengali Literature',
  physics: 'Science & Mathematics',
}

const THREAD_LABELS: Record<string, string> = {
  ireland: 'Ireland',
  cambridge: 'Cambridge',
  oxford: 'Oxford',
  fishing: 'Fishing',
  india: 'India',
  puzzles: 'Puzzles',
  archaeology: 'Archaeology',
  drama: 'The stage',
}

export function buildGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  const genres = new Set<Genre>()
  for (const b of books) genres.add(b.genre)
  for (const g of genres) nodes.push({ id: `g:${g}`, kind: 'genre', label: g, genre: g, x: 0, y: 0 })

  // Thread hubs for tags shared by at least two books (skipping tags that map
  // to a genre hub, and tags whose books already share a genre).
  const tagBooks = new Map<string, Book[]>()
  for (const b of books) {
    for (const t of b.tags ?? []) {
      if (TAG_TO_GENRE[t]) continue
      tagBooks.set(t, [...(tagBooks.get(t) ?? []), b])
    }
  }
  for (const [tag, tagged] of tagBooks) {
    if (tagged.length < 2) continue
    if (new Set(tagged.map((b) => b.genre)).size < 2) continue
    nodes.push({ id: `t:${tag}`, kind: 'thread', label: THREAD_LABELS[tag] ?? tag, x: 0, y: 0 })
  }
  const threadIds = new Set(nodes.filter((n) => n.kind === 'thread').map((n) => n.id))

  for (const b of books) {
    nodes.push({ id: b.id, kind: 'book', label: b.title, book: b, genre: b.genre, x: 0, y: 0 })
    links.push({ source: b.id, target: `g:${b.genre}`, kind: 'genre' })
    for (const t of b.tags ?? []) {
      const mapped = TAG_TO_GENRE[t]
      if (mapped && mapped !== b.genre) links.push({ source: b.id, target: `g:${mapped}`, kind: 'thread' })
      else if (threadIds.has(`t:${t}`)) links.push({ source: b.id, target: `t:${t}`, kind: 'thread' })
    }
  }

  // Same writer, different books.
  for (let i = 0; i < books.length; i++) {
    for (let j = i + 1; j < books.length; j++) {
      const shared = peopleOf(books[i]).some((p) => peopleOf(books[j]).includes(p))
      if (shared) links.push({ source: books[i].id, target: books[j].id, kind: 'author' })
    }
  }

  return { nodes, links }
}

// Deterministic PRNG so the sky looks the same on every visit.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SPRING_LENGTH: Record<LinkKind, number> = { genre: 88, thread: 150, author: 48 }

export function layoutGraph(width: number, height: number): { nodes: GraphNode[]; links: GraphLink[] } {
  const { nodes, links } = buildGraph()
  const rand = mulberry32(20260711)
  const cx = width / 2
  const cy = height / 2

  for (const n of nodes) {
    const r = Math.min(width, height) * (n.kind === 'book' ? 0.42 : 0.2) * Math.sqrt(rand())
    const a = rand() * Math.PI * 2
    n.x = cx + r * Math.cos(a)
    n.y = cy + r * Math.sin(a)
  }

  const index = new Map(nodes.map((n) => [n.id, n]))
  const vx = new Float64Array(nodes.length)
  const vy = new Float64Array(nodes.length)
  const pos = new Map(nodes.map((n, i) => [n.id, i]))

  const ITER = 460
  for (let step = 0; step < ITER; step++) {
    const alpha = 1 - step / ITER
    // Pairwise repulsion.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) {
          dx = (rand() - 0.5) * 2
          dy = (rand() - 0.5) * 2
          d2 = dx * dx + dy * dy
        }
        const strength = (a.kind !== 'book' && b.kind !== 'book' ? 13000 : 1700) * alpha
        const f = Math.min(strength / d2, 18)
        const d = Math.sqrt(d2)
        vx[i] += (dx / d) * f
        vy[i] += (dy / d) * f
        vx[j] -= (dx / d) * f
        vy[j] -= (dy / d) * f
      }
    }
    // Springs along links.
    for (const l of links) {
      const a = index.get(l.source)!
      const b = index.get(l.target)!
      const ia = pos.get(l.source)!
      const ib = pos.get(l.target)!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const stretch = (d - SPRING_LENGTH[l.kind]) / d
      const k = 0.05 * alpha * (l.kind === 'author' ? 2 : 1)
      vx[ia] += dx * stretch * k
      vy[ia] += dy * stretch * k
      vx[ib] -= dx * stretch * k
      vy[ib] -= dy * stretch * k
    }
    // Gentle gravity toward center, stronger for hubs.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const g = (n.kind === 'book' ? 0.02 : 0.012) * alpha
      vx[i] += (cx - n.x) * g
      vy[i] += (cy - n.y) * g
      n.x += vx[i] * 0.5
      n.y += vy[i] * 0.5
      vx[i] *= 0.32
      vy[i] *= 0.32
    }
  }

  // Clamp into frame with padding.
  const pad = 34
  for (const n of nodes) {
    n.x = Math.max(pad, Math.min(width - pad, n.x))
    n.y = Math.max(pad, Math.min(height - pad, n.y))
  }

  return { nodes, links }
}
