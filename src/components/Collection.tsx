import { books, coverUrl, genreColor, genreCount, genresBySize, type Book, type Genre } from '../lib/collection'

interface Props {
  onOpen: (book: Book) => void
  genre: Genre | null
  onPick: (g: Genre | null) => void
}

export default function Collection({ onOpen, genre, onPick }: Props) {
  const pick = (g: Genre | null) => {
    onPick(g)
    history.replaceState(null, '', g ? `#collection?genre=${encodeURIComponent(g)}` : '#collection')
  }

  const shown = genre ? books.filter((b) => b.genre === genre) : books

  return (
    <section id="collection" aria-label="The collection">
      <header className="section-head" data-reveal>
        <h2>The collection</h2>
        <p>
          Every identified volume, with cover art matched from Open Library. Filter by section, or click a book for its
          record.
        </p>
      </header>

      <div className="pills" role="group" aria-label="Filter by genre">
        <button
          type="button"
          className={`pill ${genre === null ? 'on' : ''}`}
          onClick={() => pick(null)}
          aria-pressed={genre === null}
        >
          All <span className="pill-n">{books.length}</span>
        </button>
        {genresBySize.map((g) => (
          <button
            key={g}
            type="button"
            className={`pill ${genre === g ? 'on' : ''}`}
            onClick={() => pick(g)}
            aria-pressed={genre === g}
          >
            <span className="swatch" style={{ background: genreColor(g) }} aria-hidden="true" />
            {g} <span className="pill-n">{genreCount(g)}</span>
          </button>
        ))}
      </div>

      <ul className="card-grid">
        {shown.map((b) => {
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
    </section>
  )
}
