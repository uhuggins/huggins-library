# Build specification — The Huggins Library

Detailed enough for a fresh Claude (Sonnet) session to rebuild the app from
nothing, or to port it to another stack without losing what makes it work.
The existing implementation in this repo is the reference; when this document
and the code disagree, the code wins.

## 1. What this is

A single-page catalog of a physical home library, populated by photographing
shelves and having Claude transcribe the spines. Static site: Vite + React 18 +
TypeScript, plain CSS (one stylesheet, custom properties), zero runtime
dependencies beyond React. No backend; cover images hotlink from
covers.openlibrary.org. Production JS budget: under 70 kB gzipped.

## 2. Design system ("the library at night")

Derived from the physical books themselves: green cloth bindings, gilt spine
lettering, aged paper. One accent only.

Tokens (CSS custom properties on :root):

| Token | Value | Role |
|---|---|---|
| --page | #100d0a | page background (deep warm ink, never pure black) |
| --surface | #17140f | cards, chart panels |
| --surface-2 | #1e1a14 | nested surfaces |
| --panel | #1b1712 | dialog |
| --paper | #ede4d0 | primary text |
| --paper-dim | #b3a88f | secondary text |
| --paper-mute | #8d8371 | annotations, axes |
| --gilt | #c9a961 | THE accent: data marks, active states, eyebrow |
| --gilt-bright | #e0c47e | hover/emphasis step of the accent |
| --hairline | rgba(237,228,208,.13) | borders |
| --wood / --wood-hi / --wood-dark | #5e4128 / #8a6a45 / #3a2a19 | shelf timber |

Type: Libre Caslon Display (display, h1/h2/stat values), Libre Caslon Text
(prose, book titles), Archivo 400–600 (UI labels), Spline Sans Mono (eyebrow,
shelf labels, data annotations). Google Fonts is fine.

Chart categorical palette (dark-surface validated, CVD-checked, in this exact
order): #3987e5 #199e70 #c98500 #008300 #9085e9 #e66767 #d55181 #d95926.
Assign slots to the 8 largest genres by book count, descending; every smaller
genre gets neutral #8d8371. Identity is never color alone: legends + labels +
a table view exist.

Copy rules: no em-dashes anywhere visible; sentence case; plain verbs; numbered
markers only for true sequences (the add-books steps qualify; nothing else does).
Respect prefers-reduced-motion: entrance animations off, book hover becomes a
plain lift, smooth scroll off.

## 3. Data model

```ts
type Genre = 'Mystery & Crime' | 'History & Antiquity' | ... // union, ~15 values

interface Book {
  id: string            // kebab slug, unique
  title: string
  author: string        // display string
  people?: string[]     // individuals, for shared-writer graph edges
  publisher?: string
  year?: number         // first publication of the WORK
  genre: Genre          // exactly one
  tags?: string[]       // cross-genre threads: ireland, fishing, cambridge...
  shelf: 1|2|3|4|5
  spine: { bg: string; ink: string; h: number /*0.6-1*/; w: number /*px*/;
           kind: 'hardback'|'paperback'; lean?: number /*deg*/ }
  uncertain?: boolean   // spine only partly legible; UI must say so
  note?: string
}
```

`covers.json` (generated): `{ [bookId]: { coverId, workKey, firstPublishYear,
matchedTitle } }`. Cover URL: `https://covers.openlibrary.org/b/id/{coverId}-{S|M|L}.jpg`;
work URL: `https://openlibrary.org{workKey}`.

Cover fetch script: for each book, GET
`https://openlibrary.org/search.json?title=<cleaned>&author=<cleaned>&limit=10&fields=key,title,author_name,cover_i,first_publish_year,edition_count`
with a descriptive User-Agent; prefer the highest-edition-count doc that has a
cover; sleep ~350 ms between calls; log every match for human review.

## 4. Page structure, top to bottom

1. **Nav** (sticky, 58px, blur backdrop): wordmark + links Shelves / Collection /
   Ledger / Constellation / Add books. Wordmark hidden under 560px.
2. **Hero**: mono uppercase eyebrow "A HOME LIBRARY, CATALOGUED", display title,
   one serif subline with live counts (books, span of years). No CTA buttons;
   the shelf below is the hero's payoff.
3. **Shelves** (the signature): one `.shelf` block per physical shelf: label row
   (SHELF I roman numeral in mono gilt, italic serif caption, right-aligned
   volume count), then a flex row of books standing on a wooden ledge
   (gradient bar + shadow), inside a bookcase frame (12px wood side borders,
   inset shadow).
   - Each book: a button sized w×h from spine data (w scaled ×1.7 desktop,
     ×1.25 mobile; h = 60 + 210·spine.h px). Spine face: bg color + a light
     gradient (light from upper left), vertical-rl title (serif for hardbacks,
     sans 500 for paperbacks), author shown only when w ≥ 34.
   - 3D: wrapper `.slot` has `perspective: 900px` and applies `lean` rotation
     (origin bottom right). The button is `transform-style: preserve-3d`,
     origin `100% 50%`. Cover face: absolute, left:100%, width = h·0.68,
     local `rotateY(90deg)`, origin left center, `backface-visibility: hidden`,
     `visibility: hidden` until hover. Hover/focus on the button:
     `translate3d(-6px,-16px,70px) rotateY(-42deg)` + drop-shadow, cover becomes
     visible showing the real cover image (mounted lazily on first hover).
   - Entrance: per-slot rise animation, delay index·26 ms.
   - Click anywhere → book record dialog.
4. **Collection**: filter pills (All + each genre with count and color swatch,
   active pill = gilt fill), 2/3-aspect cover cards in an auto-fill grid
   (min 158px), spine-color background while covers load, generated "board"
   with title for books without covers. Filter state lives in the URL hash
   (`#collection?genre=...`) and survives reload.
5. **Ledger**: five stat tiles (volumes, writers, sections, years spanned,
   covers matched; values in display serif, gilt). Two chart panels:
   - Sections bar chart: horizontal, sorted desc, single hue (gilt), rounded
     data-end only, direct value labels, hover tooltip, click filters the
     Collection and scrolls to it.
   - Era columns: buckets "before 1800" + each decade 1800s–2010s, zero decades
     shown as faint stubs, peak column labeled, hover tooltips, sparse mono
     axis labels.
   - `<details>` "Read the ledger as a table": full sortable-by-title table
     (satisfies the chart table-view rule).
6. **Constellation**: SVG (viewBox 1000×740) force-directed graph.
   - Nodes: every book (circle r 4.5 paperback / 6 hardback, fill = genre color,
     ring in page color); genre hubs (diamonds + Archivo label, halo stroke);
     thread hubs (open circles + mono uppercase label) for tags shared by ≥2
     books of different genres (tags that name a genre link to that hub
     instead).
   - Edges: book→genre (faint), book→thread (gilt dashed), book↔book shared
     person (gilt solid, the brightest).
   - Layout precomputed synchronously with a seeded PRNG (mulberry32, fixed
     seed) — deterministic, no per-frame React state. ~460 iterations:
     pairwise repulsion (hubs repel hubs ~8× books), springs (genre 88 /
     thread 150 / author 48), center gravity, clamp with 34px padding.
   - Hover: enlarge + gilt ring, dim non-neighbors, tooltip (title, author,
     genre). Click opens the record. Each node has an invisible r=13 hit
     circle, tabIndex 0, Enter/Space activates.
   - Legend: 8 genre swatches + "smaller sections" neutral + line-style key.
7. **Add to the library**: three numbered step cards (photograph → upload to
   photos/inbox on GitHub → run `claude "/add-books"`).
8. **Colophon**: type credits, data source (Open Library), honesty note about
   approximated spine colors and flagged uncertain records.
9. **Book record dialog** (native `<dialog>`, showModal): cover L-size or
   generated board, genre chip (dot + name), display-serif title, italic
   author, meta grid (first published, edition/publisher, shelf roman numeral,
   writers, threads, "Open Library says" when its year differs), note italic,
   uncertain badge, Open Library link, close ×, backdrop blur, Esc and
   backdrop-click close.

## 5. Quality bar

- `tsc --noEmit` clean; production build under budget.
- Keyboard: every interactive element focusable with visible gilt focus ring;
  dialog focus management via native showModal.
- Hit targets ≥ 24px (invisible expansion where marks are small).
- prefers-reduced-motion fully honored.
- Charts: hover tooltips everywhere, no dual axes, single hue for magnitude,
  table fallback present.
- Wide tables scroll inside their own container, never the page.
