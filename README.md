# The Huggins Library

**Live:** https://huggins-library.vercel.app ·
**Repo:** https://github.com/uhuggins/huggins-library
(pushes to `main` deploy automatically)

A home library catalogued from photographs. Five shelves were photographed spine by
spine; the books were identified, tagged by genre and author, matched to cover art
and publication records on Open Library, and laid out as a browsable site.

Design notes: dark "library at night" theme drawn from the actual bindings in the
photos (green cloth, gilt lettering, aged paper), set in Libre Caslon and Archivo,
with one gilt accent. Inspired by the physicality of Stripe Press.

## Sections

- **Shelves** — a CSS-3D bookcase generated from the catalog. Every spine's color,
  height, thickness, and lean approximates the real shelf. Hover pulls a book out
  and turns its actual cover toward you.
- **Collection** — cover grid with genre filters (state in the URL hash).
- **Ledger** — stat tiles, genre bars, and an era histogram, plus a plain-table view.
- **Constellation** — a force-directed graph: books orbit their genre hubs, gold
  lines join books by the same writer, dotted lines follow cross-genre threads
  (Ireland, Cambridge, fishing, and so on).

## Running

```sh
npm install
npm run dev      # http://localhost:5180
npm run build    # typecheck + production build
```

## Data pipeline

- `src/data/books.ts` — the hand-checked catalog transcribed from the photos.
  Books whose spines were only partly legible are flagged `uncertain` and say so
  in the UI.
- `scripts/fetch-covers.mjs` (`npm run covers`) — looks each title up in the Open
  Library search API and writes cover ids, work keys, and first-publication years
  to `src/data/covers.json`. Covers are then served from covers.openlibrary.org
  at runtime. Two known-bad matches were removed by hand; re-running the script
  will bring them back, so re-check its output if you run it again.

## Adding books

Photograph a shelf, upload the photos to `photos/inbox/` (the site's "Add to
the library" section links straight to GitHub's upload page, which works from
a phone camera roll), then either:

- run `claude "/add-books"` locally, which transcribes the spines, tags
  genres, fetches covers, verifies the build, and archives the photos; or
- add an `ANTHROPIC_API_KEY` repository secret once, and the
  `Catalog new shelf photos` GitHub Action will have Claude Sonnet do the same
  automatically on upload and open a pull request.

Detailed model instructions live in `CLAUDE.md`,
`.claude/skills/add-books/SKILL.md`, and `docs/BUILD-SPEC.md`.
