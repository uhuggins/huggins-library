import { books, peopleOf, type Book, type Genre } from '../data/books'
import coversData from '../data/covers.json'

export interface CoverInfo {
  coverId: number | null
  workKey: string | null
  firstPublishYear: number | null
  matchedTitle: string | null
}

const covers = coversData as Record<string, CoverInfo>

export const coverInfo = (b: Book): CoverInfo | undefined => covers[b.id]

export const coverUrl = (b: Book, size: 'S' | 'M' | 'L'): string | null => {
  const info = covers[b.id]
  return info?.coverId ? `https://covers.openlibrary.org/b/id/${info.coverId}-${size}.jpg` : null
}

export const openLibraryUrl = (b: Book): string | null => {
  const info = covers[b.id]
  return info?.workKey ? `https://openlibrary.org${info.workKey}` : null
}

// ── Genre colors ─────────────────────────────────────────────────────────────
// The eight largest genres take the validated categorical slots (dark-surface
// palette, CVD-checked in fixed order); smaller sections share a neutral.
// Identity is never color alone: hubs are labeled, nodes have tooltips,
// and the ledger has a table view.

export const NEUTRAL_GENRE = '#8d8371'

const genreCounts = new Map<Genre, number>()
for (const b of books) genreCounts.set(b.genre, (genreCounts.get(b.genre) ?? 0) + 1)

export const genresBySize: Genre[] = [...genreCounts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([g]) => g)

const SLOTS = ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926']

export const genreColor = (g: Genre): string => {
  const rank = genresBySize.indexOf(g)
  return rank > -1 && rank < SLOTS.length ? SLOTS[rank] : NEUTRAL_GENRE
}

export const genreCount = (g: Genre): number => genreCounts.get(g) ?? 0

// ── Stats ────────────────────────────────────────────────────────────────────

export const stats = (() => {
  const people = new Set<string>()
  for (const b of books) peopleOf(b).forEach((p) => people.add(p))
  const years = books.map((b) => b.year).filter((y): y is number => !!y)
  const coversFound = books.filter((b) => covers[b.id]?.coverId).length
  return {
    books: books.length,
    writers: people.size,
    genres: genreCounts.size,
    yearMin: Math.min(...years),
    yearMax: Math.max(...years),
    coversFound,
    shelves: 5,
  }
})()

export const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const

export const SHELF_CAPTIONS: Record<number, string> = {
  1: 'Dictionaries, physics, and Dover crime',
  2: 'Verse, anglers, spies, and phrasebooks',
  3: 'Byron, Chaucer, Yeats, and old cloth',
  4: 'Atlases, archaeology, and Inspector Morse',
  5: 'The astronomy shelf, lives, and Bengal',
}

export { books, peopleOf }
export type { Book, Genre }
