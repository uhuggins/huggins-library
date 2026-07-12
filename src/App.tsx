import { useEffect, useState } from 'react'
import Shelves from './components/Shelves'
import Collection from './components/Collection'
import Ledger from './components/Ledger'
import Constellation from './components/Constellation'
import AddBooks from './components/AddBooks'
import BookDialog from './components/BookDialog'
import { stats, type Book, type Genre } from './lib/collection'

const readHashGenre = (): Genre | null => {
  const m = decodeURIComponent(window.location.hash).match(/genre=([^&]+)/)
  return m ? (m[1] as Genre) : null
}

export default function App() {
  const [openBook, setOpenBook] = useState<Book | null>(null)
  const [genre, setGenre] = useState<Genre | null>(() => readHashGenre())

  const pickGenreAndGo = (g: Genre) => {
    setGenre(g)
    history.replaceState(null, '', `#collection?genre=${encodeURIComponent(g)}`)
    document.getElementById('collection')?.scrollIntoView()
  }

  // Reveal-on-scroll for section blocks.
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <nav className="nav" aria-label="Site">
        <a className="wordmark" href="#top">
          The Huggins Library
        </a>
        <div className="nav-links">
          <a href="#shelves">Shelves</a>
          <a href="#collection">Collection</a>
          <a href="#ledger">Ledger</a>
          <a href="#constellation">Constellation</a>
          <a href="#add">Add books</a>
        </div>
      </nav>

      <main id="top">
        <header className="hero">
          <p className="eyebrow">A home library, catalogued</p>
          <h1>
            The Huggins
            <br />
            Library
          </h1>
          <p className="hero-sub">
            Five shelves photographed and read spine by spine: {stats.books} volumes of golden-age crime, Irish
            letters, astronomy, and the odd Bengali anthology, from {stats.yearMin} to {stats.yearMax}.
          </p>
        </header>

        <Shelves onOpen={setOpenBook} />
        <Collection onOpen={setOpenBook} genre={genre} onPick={setGenre} />
        <Ledger onPickGenre={pickGenreAndGo} />
        <Constellation onOpen={setOpenBook} />
        <AddBooks />
      </main>

      <footer className="colophon">
        <p>
          Set in Libre Caslon and Archivo. Cover art and publication records matched from Open Library; spine colors
          approximate the actual bindings. Where a spine was only partly legible, the record says so.
        </p>
        <p className="colophon-fine">
          Catalogued from photographs, July 2026 · data via{' '}
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
            openlibrary.org
          </a>
        </p>
      </footer>

      <BookDialog book={openBook} onClose={() => setOpenBook(null)} />
    </>
  )
}
