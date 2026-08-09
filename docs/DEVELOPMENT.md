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

Photos land in `photos/inbox/` by one of three routes:

1. **The website form** ("Add your shelf"): anyone submits a name and photos.
   The browser shrinks each photo to a JPEG, `api/submit-shelf.ts` (a Vercel
   function) validates it and commits it to the inbox as
   `name--<timestamp>.jpg`. The name prefix marks a guest shelf: the
   cataloguing pass gives it a new shelf number and registers the owner in
   `SHELF_OWNERS` (`src/lib/collection.ts`).
2. **GitHub's upload page** for the folder, from any logged-in account.
3. **Locally**, by dropping files in the folder.

Then either run `claude "/add-books"` locally (transcribes spines, appends
catalog entries, fetches covers, verifies the build, archives photos to
`photos/shelves/`), or let the `Catalog new shelf photos` workflow do the same
in CI and open a pull request. Nothing reaches the site until that pull
request is merged, which is the review gate for public submissions.

### One-time setup for the hosted flow

- **Vercel** → Project → Settings → Environment Variables:
  `GITHUB_CONTENT_TOKEN` = a fine-grained personal access token scoped to
  this repository with Contents read/write. Until it exists the form's
  endpoint answers 503 with a friendly message.
- **GitHub** → Settings → Secrets and variables → Actions:
  `ANTHROPIC_API_KEY`, so the workflow can run Claude. Without it the
  workflow fails early and photos simply wait in the inbox.

## Deploy

Pushes to `main` auto-deploy to Vercel (project `huggins-library`). Manual
deploy: `vercel --prod`.
