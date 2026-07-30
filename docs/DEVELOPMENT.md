# Development notes

The technical companion to the human-facing README. For the full build
specification (design tokens, section anatomy, layout algorithms), see
[BUILD-SPEC.md](BUILD-SPEC.md). Instructions for Claude sessions live in the
repo root `CLAUDE.md` and in `.claude/skills/add-books/SKILL.md`.

## Stack

Vite + React 18 + TypeScript, one plain CSS file, no runtime dependencies
beyond React. Static site, no backend; cover images hotlink from
covers.openlibrary.org.

## Commands

```sh
npm install
npm run dev      # dev server on http://localhost:5180
npm run build    # typecheck (tsc --noEmit) + production build
npm run covers   # regenerate src/data/covers.json from Open Library
```

There is no test suite. The build plus a look at the dev server is the
verification bar; keep `npm run build` green.

## Data pipeline

- `src/data/books.ts` is the hand-checked catalog; everything on the page
  derives from it. One entry per physical volume, with genre, tags, shelf
  number, and spine geometry/colors sampled from the photographs. Books whose
  spines were only partly legible carry `uncertain: true` and a note.
- `scripts/fetch-covers.mjs` (`npm run covers`) queries the Open Library
  search API per book and writes cover ids, work keys, and first-publication
  years to `src/data/covers.json`. It regenerates the whole file, so wrong
  matches that were deleted by hand come back on re-run: re-check its log
  every time. Known matches that must stay deleted are listed in the
  `/add-books` skill.

## Adding books, mechanically

Photos go to `photos/inbox/` (the site's "Add to the library" section links
GitHub's upload page for that folder). Then either:

- run `claude "/add-books"` locally, which transcribes spines, appends catalog
  entries, fetches covers, verifies the build, and archives the photos to
  `photos/shelves/`; or
- add an `ANTHROPIC_API_KEY` repository secret once, and the
  `Catalog new shelf photos` workflow (`.github/workflows/add-books.yml`)
  runs the same procedure in CI on every inbox upload and opens a pull
  request. Without the secret the workflow fails early and can be ignored.

## Deploy

Pushes to `main` auto-deploy to Vercel (project `huggins-library`). Manual
deploy: `vercel --prod`.
