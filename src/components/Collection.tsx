import { useEffect, useRef, useState } from 'react'
import { books, coverUrl, genreColor, genreCount, genresBySize, peopleOf, type Book, type Genre } from '../lib/collection'

interface Props {
  onOpen: (book: Book) => void
  genre: Genre | null
  onPick: (g: Genre | null) => void
}

const readHashQuery = (): string => {
  const m = decodeURIComponent(window.location.hash).match(/q=([^&]+)/)
  return m ? m[1] : ''
}

const matches = (b: Book, q: string): boolean => {
  const hay = [b.title, b.author, ...peopleOf(b), b.publisher ?? '', b.genre, ...(b.tags ?? []), b.note ?? '', String(b.year ?? '')]
    .join(' ')
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word))
}

const CAP = 24

export default function Collection({ onOpen, genre, onPick }: Props) {
  const [q, setQ] = useState<string>(() => readHashQuery())
  const [expanded, setExpanded] = useState(false)
  const wrote = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // A new search or filter starts back at the first page of results.
  useEffect(() => {
    setExpanded(false)
  }, [genre, q])

  // One writer for the section's URL state.
  useEffect(() => {
    if (!wrote.current && genre === null && q === '') return
    wrote.current = true
    const params = [
      genre ? `genre=${encodeURIComponent(genre)}` : '',
      q ? `q=${encodeURIComponent(q)}` : '',
    ]
      .filter(Boolean)
      .join('&')
    history.replaceState(null, '', params ? `#collection?${params}` : '#collection')
  }, [genre, q])

  const shown = books.filter((b) => (genre ? b.genre === genre : true) && (q.trim() ? matches(b, q) : true))
  const filtering = genre !== null || q.trim() !== ''
  const visible = expanded ? shown : shown.slice(0, CAP)

  const collapse = () => {
    setExpanded(false)
    document.getElementById('collection')?.scrollIntoView()
  }

  return (
    <section id="collection" aria-label="The collection">
      <header className="section-head" data-reveal>
        <h2>The collection</h2>
        <p>
          Every identified volume, with cover art matched from Open Library. Search, filter by section, or click a book
          for its record.
        </p>
      </header>

      <div className="search-row">
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search titles, writers, publishers, threads"
          aria-label="Search the collection"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQ('')
          }}
        />
        {filtering && (
          <p className="search-count" role="status">
            {shown.length} of {books.length} volumes
            {q.trim() && (
              <button
                type="button"
                className="search-clear"
                onClick={() => {
                  setQ('')
                  inputRef.current?.focus()
                }}
              >
                Clear search
              </button>
            )}
          </p>
        )}
      </div>

      <div className="pills" role="group" aria-label="Filter by genre">
        <button
          type="button"
          className={`pill ${genre === null ? 'on' : ''}`}
          onClick={() => onPick(null)}
          aria-pressed={genre === null}
        >
          All <span className="pill-n">{books.length}</span>
        </button>
        {genresBySize.map((g) => (
          <button
            key={g}
            type="button"
            className={`pill ${genre === g ? 'on' : ''}`}
            onClick={() => onPick(genre === g ? null : g)}
            aria-pressed={genre === g}
          >
            <span className="swatch" style={{ background: genreColor(g) }} aria-hidden="true" />
            {g} <span className="pill-n">{genreCount(g)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="empty-state">
          Nothing shelved matches that. Try fewer words, or clear the section filter.
        </p>
      ) : (
        <ul className="card-grid">
          {visible.map((b) => {
            const cover = coverUrl(b, 'M')
            return (
              <li key={b.id}>
                <button type="button" className="card" onClick={() => onOpen(b)}>
                  <span className="card-cover" style={cover ? { background: b.spine.bg } : undefined}>
                    {cover ? (
                      <img src={cover} alt="" loading="lazy" />
                    ) : (
                      <span className="card-board" style={{ background: b.spine.bg, color: b.spine.ink }}>
                        {b.title}
                      </span>
                    )}
                  </span>
                  <span className="card-title">{b.title}</span>
                  <span className="card-author">{b.author}</span>
                  <span className="card-meta">
                    {b.year ?? ''}
                    {b.uncertain ? ' · spine partly legible' : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {shown.length > CAP && (
        <div className="show-more">
          {expanded ? (
            <button type="button" className="show-more-btn" onClick={collapse}>
              Show the first {CAP}
            </button>
          ) : (
            <button type="button" className="show-more-btn" onClick={() => setExpanded(true)}>
              Show all {shown.length} volumes
            </button>
          )}
        </div>
      )}
    </section>
  )
}
