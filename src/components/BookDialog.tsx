import { useEffect, useRef } from 'react'
import { coverInfo, coverUrl, genreColor, openLibraryUrl, peopleOf, ROMAN, type Book } from '../lib/collection'

interface Props {
  book: Book | null
  onClose: () => void
}

export default function BookDialog({ book, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (book && !dialog.open) dialog.showModal()
    if (!book && dialog.open) dialog.close()
  }, [book])

  if (!book) return <dialog ref={ref} className="book-dialog" onClose={onClose} />

  const cover = coverUrl(book, 'L')
  const info = coverInfo(book)
  const olUrl = openLibraryUrl(book)
  const s = book.spine

  return (
    <dialog
      ref={ref}
      className="book-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      aria-label={book.title}
    >
      <div className="dialog-inner">
        <div className="dialog-cover">
          {cover ? (
            <figure>
              <img src={cover} alt={`Cover of ${book.title}`} />
              <figcaption>Cover matched on Open Library</figcaption>
            </figure>
          ) : (
            <div className="dialog-board" style={{ background: s.bg, color: s.ink }}>
              <span>{book.title}</span>
              <small>{book.author}</small>
            </div>
          )}
        </div>
        <div className="dialog-body">
          <p className="dialog-genre">
            <span className="swatch" style={{ background: genreColor(book.genre) }} aria-hidden="true" />
            {book.genre}
          </p>
          <h3>{book.title}</h3>
          <p className="dialog-author">{book.author}</p>
          {book.uncertain && <p className="dialog-uncertain">Spine partly legible, identification is a best guess</p>}
          <dl className="dialog-meta">
            {book.year && (
              <div>
                <dt>First published</dt>
                <dd>{book.year}</dd>
              </div>
            )}
            {book.publisher && (
              <div>
                <dt>This edition</dt>
                <dd>{book.publisher}</dd>
              </div>
            )}
            <div>
              <dt>Shelved</dt>
              <dd>Shelf {ROMAN[book.shelf - 1]}</dd>
            </div>
            {peopleOf(book).length > 1 && (
              <div>
                <dt>Writers</dt>
                <dd>{peopleOf(book).join(', ')}</dd>
              </div>
            )}
            {book.tags && book.tags.length > 0 && (
              <div>
                <dt>Threads</dt>
                <dd>{book.tags.join(', ')}</dd>
              </div>
            )}
            {info?.firstPublishYear && info.firstPublishYear !== book.year && (
              <div>
                <dt>Open Library says</dt>
                <dd>first published {info.firstPublishYear}</dd>
              </div>
            )}
          </dl>
          {book.note && <p className="dialog-note">{book.note}</p>}
          {olUrl && (
            <a className="dialog-link" href={olUrl} target="_blank" rel="noreferrer">
              View on Open Library
            </a>
          )}
        </div>
        <button type="button" className="dialog-close" onClick={() => ref.current?.close()} aria-label="Close">
          ×
        </button>
      </div>
    </dialog>
  )
}
