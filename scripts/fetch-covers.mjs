// Looks up each catalogued book on Open Library and records its cover id,
// work key, and first publication year into src/data/covers.json.
// Run with: npm run covers

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// books.ts is TypeScript; extract the array with a light transform.
const source = readFileSync(join(root, 'src/data/books.ts'), 'utf8')
const entries = [...source.matchAll(/\{\s*id: '([^']+)',\s*title: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),\s*author: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)].map(
  (m) => ({
    id: m[1],
    title: (m[2] ?? m[3] ?? '').replace(/\\'/g, "'"),
    author: (m[4] ?? m[5] ?? '').replace(/\\'/g, "'"),
  }),
)

if (entries.length < 50) {
  console.error(`Only parsed ${entries.length} books from books.ts; regex likely out of date.`)
  process.exit(1)
}

const cleanTitle = (t) =>
  t
    .replace(/\(.*?\)/g, '')
    .replace(/[‘’']/g, '')
    .split(':')[0]
    .split(',')[0]
    .trim()

const cleanAuthor = (a) =>
  a
    .replace(/\(ed\.\)/g, '')
    .replace(/, trans\..*$/, '')
    .replace(/, rev\..*$/, '')
    .split('&')[0]
    .replace(/[‘’']/g, '')
    .trim()

const SKIP_AUTHOR = new Set(['Bengali story anthology', 'Berlitz', 'Langenscheidt', 'The Times', 'Lonely Planet'])

async function lookup(book) {
  const title = cleanTitle(book.title)
  const author = cleanAuthor(book.author)
  const params = new URLSearchParams({ title, limit: '10', fields: 'key,title,author_name,cover_i,first_publish_year,edition_count' })
  if (author && !SKIP_AUTHOR.has(book.author)) params.set('author', author)
  const url = `https://openlibrary.org/search.json?${params}`
  const res = await fetch(url, { headers: { 'User-Agent': 'huggins-library-catalog/0.1 (personal home library project)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const docs = (data.docs ?? []).filter((d) => d.cover_i)
  // Prefer the most-published edition with a cover; fall back to any doc.
  docs.sort((a, b) => (b.edition_count ?? 0) - (a.edition_count ?? 0))
  const best = docs[0] ?? (data.docs ?? [])[0]
  if (!best) return null
  return {
    coverId: best.cover_i ?? null,
    workKey: best.key ?? null,
    firstPublishYear: best.first_publish_year ?? null,
    matchedTitle: best.title ?? null,
  }
}

const out = {}
let hits = 0
for (const book of entries) {
  try {
    const result = await lookup(book)
    if (result) {
      out[book.id] = result
      if (result.coverId) hits++
    }
    console.log(`${result?.coverId ? '✓' : '·'} ${book.id}${result?.matchedTitle ? ` → ${result.matchedTitle}` : ' (no match)'}`)
  } catch (err) {
    console.log(`✗ ${book.id}: ${err.message}`)
  }
  await new Promise((r) => setTimeout(r, 350))
}

writeFileSync(join(root, 'src/data/covers.json'), JSON.stringify(out, null, 2))
console.log(`\n${hits}/${entries.length} covers found → src/data/covers.json`)
