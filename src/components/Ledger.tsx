import { useState } from 'react'
import { books, genreCount, genresBySize, stats, ROMAN, type Genre } from '../lib/collection'

interface Props {
  onPickGenre: (g: Genre) => void
}

interface Tip {
  x: number
  y: number
  head: string
  body: string
}

function useTip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const show = (e: React.MouseEvent | React.FocusEvent, head: string, body: string) => {
    const el = e.currentTarget as HTMLElement
    const wrap = el.closest('.chart-wrap') as HTMLElement
    const r = el.getBoundingClientRect()
    const w = wrap.getBoundingClientRect()
    setTip({ x: r.left - w.left + r.width / 2, y: r.top - w.top, head, body })
  }
  return { tip, show, hide: () => setTip(null) }
}

function TipBox({ tip }: { tip: Tip | null }) {
  if (!tip) return null
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <strong>{tip.head}</strong>
      <span>{tip.body}</span>
    </div>
  )
}

function GenreBars({ onPickGenre }: Props) {
  const { tip, show, hide } = useTip()
  const max = Math.max(...genresBySize.map((g) => genreCount(g)))
  return (
    <figure className="chart">
      <figcaption>
        <h3>Sections of the library</h3>
        <p>Volumes per genre. Click a bar to browse that section.</p>
      </figcaption>
      <div className="chart-wrap">
        <div className="bar-chart">
          {genresBySize.map((g) => {
            const n = genreCount(g)
            const pct = Math.round((n / stats.books) * 100)
            return (
              <button
                key={g}
                type="button"
                className="bar-row"
                onClick={() => onPickGenre(g)}
                onMouseEnter={(e) => show(e, g, `${n} of ${stats.books} books, ${pct}% of the library`)}
                onMouseLeave={hide}
                onFocus={(e) => show(e, g, `${n} of ${stats.books} books, ${pct}% of the library`)}
                onBlur={hide}
              >
                <span className="bar-name">{g}</span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="bar-value">{n}</span>
              </button>
            )
          })}
        </div>
        <TipBox tip={tip} />
      </div>
    </figure>
  )
}

function EraColumns() {
  const { tip, show, hide } = useTip()

  const buckets: { key: string; label: string; count: number; titles: string[] }[] = []
  buckets.push({ key: 'pre', label: 'before 1800', count: 0, titles: [] })
  for (let d = 1800; d <= 2020; d += 10) {
    buckets.push({ key: String(d), label: `${d}s`, count: 0, titles: [] })
  }
  for (const b of books) {
    if (!b.year) continue
    const bucket = b.year < 1800 ? buckets[0] : buckets.find((k) => k.key === String(Math.floor(b.year! / 10) * 10))
    if (bucket) {
      bucket.count++
      bucket.titles.push(b.title)
    }
  }
  const max = Math.max(...buckets.map((b) => b.count))

  return (
    <figure className="chart">
      <figcaption>
        <h3>When the books were written</h3>
        <p>First publication of each work, from Chaucer to the 2010s.</p>
      </figcaption>
      <div className="chart-wrap">
        <div className="col-chart" role="img" aria-label={`Books by era of first publication, peak of ${max} in one decade`}>
          {buckets.map((k) => (
            <div
              key={k.key}
              className="col-cell"
              tabIndex={0}
              onMouseEnter={(e) => show(e, k.label, k.count === 0 ? 'nothing from these years' : `${k.count} ${k.count === 1 ? 'book' : 'books'}`)}
              onMouseLeave={hide}
              onFocus={(e) => show(e, k.label, k.count === 0 ? 'nothing from these years' : `${k.count} ${k.count === 1 ? 'book' : 'books'}`)}
              onBlur={hide}
            >
              {k.count === max && <span className="col-peak">{k.count}</span>}
              <span className="col-fill" style={{ height: `${k.count === 0 ? 2 : 6 + (k.count / max) * 94}%` }} data-zero={k.count === 0 || undefined} />
            </div>
          ))}
        </div>
        <div className="col-axis" aria-hidden="true">
          <span>before 1800</span>
          <span>1850s</span>
          <span>1900s</span>
          <span>1950s</span>
          <span>2000s</span>
        </div>
        <TipBox tip={tip} />
      </div>
    </figure>
  )
}

export default function Ledger({ onPickGenre }: Props) {
  return (
    <section id="ledger" aria-label="The ledger">
      <header className="section-head" data-reveal>
        <h2>The ledger</h2>
        <p>What five shelves hold, counted and dated.</p>
      </header>

      <dl className="stat-row" data-reveal>
        <div className="stat">
          <dt>Volumes identified</dt>
          <dd>{stats.books}</dd>
        </div>
        <div className="stat">
          <dt>Writers</dt>
          <dd>{stats.writers}</dd>
        </div>
        <div className="stat">
          <dt>Sections</dt>
          <dd>{stats.genres}</dd>
        </div>
        <div className="stat">
          <dt>Years spanned</dt>
          <dd>
            {stats.yearMin}–{stats.yearMax}
          </dd>
        </div>
        <div className="stat">
          <dt>Covers matched</dt>
          <dd>{stats.coversFound}</dd>
        </div>
      </dl>

      <div className="charts">
        <GenreBars onPickGenre={onPickGenre} />
        <EraColumns />
      </div>

      <details className="ledger-table">
        <summary>Read the ledger as a table</summary>
        <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Writer</th>
              <th scope="col">Year</th>
              <th scope="col">Section</th>
              <th scope="col">Shelf</th>
            </tr>
          </thead>
          <tbody>
            {[...books]
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((b) => (
                <tr key={b.id}>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td className="num">{b.year ?? ''}</td>
                  <td>{b.genre}</td>
                  <td>{ROMAN[b.shelf - 1]}</td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      </details>
    </section>
  )
}
