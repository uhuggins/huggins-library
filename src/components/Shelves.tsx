import { useState } from 'react'
import { books, coverUrl, ROMAN, SHELF_CAPTIONS, SHELF_OWNERS, shelfNumbers, type Book } from '../lib/collection'

interface Props {
  onOpen: (book: Book) => void
}

function Spine({ book, index, onOpen }: { book: Book; index: number; onOpen: (b: Book) => void }) {
  // The cover face mounts on first hover/focus, so the shelf doesn't carry
  // seventy-odd hidden image layers.
  const [warm, setWarm] = useState(false)
  const s = book.spine
  const cover = coverUrl(book, 'M')
  const height = Math.round(60 + s.h * 210)
  return (
    <div
      className="slot"
      role="listitem"
      style={{ '--delay': `${index * 26}ms`, '--lean': `${s.lean ?? 0}deg` } as React.CSSProperties}
    >
    <button
      type="button"
      className={`book ${s.kind}`}
      style={
        {
          '--bg': s.bg,
          '--ink': s.ink,
          '--w': `${s.w}px`,
          '--h': `${height}px`,
        } as React.CSSProperties
      }
      onClick={() => onOpen(book)}
      onMouseEnter={() => setWarm(true)}
      onFocus={() => setWarm(true)}
      aria-label={`${book.title}, ${book.author}`}
    >
      <span className="b-spine" aria-hidden="true">
        <span className="b-title">{book.title}</span>
        {s.w >= 34 && <span className="b-author">{book.author}</span>}
      </span>
      <span className="b-cover" aria-hidden="true">
        {cover && warm ? (
          <img src={cover} alt="" draggable={false} />
        ) : (
          <span className="b-board">
            <span>{book.title}</span>
          </span>
        )}
      </span>
    </button>
    </div>
  )
}

export default function Shelves({ onOpen }: Props) {
  const shelves = shelfNumbers
  return (
    <section id="shelves" aria-label="The shelves">
      <div className="bookcase">
        {shelves.map((n) => {
          const row = books.filter((b) => b.shelf === n)
          return (
            <div className="shelf" key={n}>
              <div className="shelf-label">
                <span className="shelf-roman">Shelf {ROMAN[n - 1]}</span>
                {SHELF_OWNERS[n] && <span className="shelf-owner">{SHELF_OWNERS[n]}&rsquo;s shelf</span>}
                <span className="shelf-caption">{SHELF_CAPTIONS[n]}</span>
                <span className="shelf-count">{row.length} vols.</span>
              </div>
              <div className="shelf-row" role="list" aria-label={`Shelf ${ROMAN[n - 1]}: ${SHELF_CAPTIONS[n]}`}>
                {row.map((b, i) => (
                  <Spine key={b.id} book={b} index={i} onOpen={onOpen} />
                ))}
              </div>
              <div className="ledge" aria-hidden="true" />
            </div>
          )
        })}
      </div>
      <p className="shelf-hint">Pull a book from the shelf to see its cover and record.</p>
    </section>
  )
}
