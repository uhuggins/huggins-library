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

Photos reach the cataloguing step by one of two routes:

1. **The website form** ("Add your shelf"): anyone submits a name and photos.
   The browser shrinks each to a JPEG, asks `api/submit-shelf.ts` for a
   short-lived presigned URL per photo, and uploads **straight to Tigris
   object storage** under `inbox/<slug>--<timestamp>-<n>.jpg`. The photo never
   passes through the site, and the repo stays code-only. The name prefix
   marks a guest shelf: the cataloguing pass gives it a new shelf number and
   registers the owner in `SHELF_OWNERS` (`src/lib/collection.ts`).
2. **Locally**, by dropping files straight into `photos/inbox/`.

To collect submissions:

```sh
node scripts/fetch-submissions.mjs            # what is waiting
node scripts/fetch-submissions.mjs --pull     # download into photos/inbox/
node scripts/fetch-submissions.mjs --archive  # move to done/ once catalogued
```

Then run `claude "/add-books"`, which transcribes spines, appends catalog
entries, fetches covers, verifies the build, and archives the photos.
Nothing reaches the site until the resulting change is reviewed and merged,
which is the review gate for public submissions.

### One-time setup for the hosted flow

**Vercel** → Project → Settings → Environment Variables (all three, for
Production):

- `TIGRIS_STORAGE_ACCESS_KEY_ID`
- `TIGRIS_STORAGE_SECRET_ACCESS_KEY`
- `TIGRIS_STORAGE_ENDPOINT` = `https://t3.storage.dev`

Optionally `TIGRIS_BUCKET` if the bucket is ever renamed; it defaults to
`huggins-library-photos`. Until the credentials exist the form's endpoint
answers 503 with a friendly message.

For local use, the same values live in `.env.local` (gitignored), which
`scripts/fetch-submissions.mjs` reads automatically.

The bucket is **private** with soft delete enabled, and Tigris permits
cross-origin PUTs to presigned URLs by default, so no CORS configuration is
needed.

### Optional: unattended cataloguing

`.github/workflows/add-books.yml` can run the same pass in CI and open a pull
request, which needs an `ANTHROPIC_API_KEY` repository secret (GitHub →
Settings → Secrets and variables → Actions). Without it the workflow fails
early and photos simply wait in the bucket, which is harmless.

## Deploy

Pushes to `main` auto-deploy to Vercel (project `huggins-library`). Manual
deploy: `vercel --prod`.
