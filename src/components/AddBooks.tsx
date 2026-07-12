const REPO = 'https://github.com/uhuggins/huggins-library'

export default function AddBooks() {
  return (
    <section id="add" aria-label="Add to the library">
      <header className="section-head" data-reveal>
        <h2>Add to the library</h2>
        <p>The catalog grows the way it began: photograph a shelf, and let Claude read the spines.</p>
      </header>

      <ol className="steps">
        <li className="step">
          <span className="step-n" aria-hidden="true">
            1
          </span>
          <h3>Photograph a shelf</h3>
          <p>
            Shoot straight on, one shelf per frame, spines filling the picture. Glare and steep angles are what make a
            spine unreadable.
          </p>
        </li>
        <li className="step">
          <span className="step-n" aria-hidden="true">
            2
          </span>
          <h3>Put the photos in the inbox</h3>
          <p>
            <a href={`${REPO}/upload/main/photos/inbox`} target="_blank" rel="noreferrer">
              Upload to photos/inbox
            </a>{' '}
            straight from your phone; the GitHub upload page can take pictures from your camera roll.
          </p>
        </li>
        <li className="step">
          <span className="step-n" aria-hidden="true">
            3
          </span>
          <h3>Let Claude catalogue them</h3>
          <p>
            Run <code>claude "/add-books"</code> in the repo. It transcribes the spines, tags genres, fetches covers,
            and the shelves, charts, and constellation all update from the catalog.
          </p>
        </li>
      </ol>
    </section>
  )
}
