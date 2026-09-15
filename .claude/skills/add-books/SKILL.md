---
name: add-books
description: Add books to the library catalog from shelf photos in photos/inbox/. Use when the user says "add these books", "process the inbox", "I photographed a new shelf", or new photos appear in photos/inbox/. Transcribes spines into src/data/books.ts, fetches covers, verifies, and archives the photos.
---

# Add books from shelf photos

You are cataloguing real books from photographs of shelf spines. Accuracy beats
completeness: a skipped unreadable spine is fine, an invented book is not.

## Procedure

1. **List the inbox.** First pull anything submitted through the website:
   `node scripts/fetch-submissions.mjs --pull` (lists and downloads from the
   Tigris bucket into `photos/inbox/`; it is safe to run with nothing waiting).
   Then `ls photos/inbox/`. If still empty, tell the user how to add photos
   (the site's "Add your shelf" form, or drop files in `photos/inbox/`) and
   stop.

   After the books are catalogued and the photos archived, run
   `node scripts/fetch-submissions.mjs --archive` so the bucket inbox does not
   re-deliver the same photos next time.

2. **Read each photo with the Read tool** (it renders images). For every spine
   you can identify, note: title, author, publisher if visible, and the spine's
   look (background color, lettering color, rough height and thickness relative
   to neighbors, hardback or paperback, any lean).

3. **Decide shelf placement.** Ask the user which shelf number the photo shows
   if it is not obvious. New shelves: use the next free number, add a caption
   in `SHELF_CAPTIONS` and, if needed, extend `ROMAN` in `lib/collection.ts`.

   **Guest shelves:** inbox files named `somename--<timestamp>.jpg` came from
   the website's "Add your shelf" form; the prefix is the submitter's name.
   Each guest's photos become NEW shelves (never merged into the house
   shelves), with the guest registered in `SHELF_OWNERS` in
   `lib/collection.ts` under the new shelf number (capitalize the name
   sensibly, e.g. `ada-w` becomes `Ada W`). Write the caption from the
   shelf's contents as usual.

4. **Check for duplicates** against existing ids and titles in
   `src/data/books.ts` before adding anything.

5. **Append one `Book` entry per identified volume** to `src/data/books.ts`,
   following the existing shape exactly:
   - `id`: kebab-case `author-shorttitle` slug, unique.
   - `year`: first publication year of the WORK from your own knowledge
     (edition year only for reference books where the edition is the point).
   - `genre`: pick from the existing `Genre` union. Only add a new genre if
     nothing fits and there are at least 2 books for it; smaller than that,
     use the closest existing genre or `Miscellany`.
   - `tags`: add threads that recur in this library (ireland, cambridge,
     oxford, india, bengal, fishing, puzzles, archaeology, astronomy, physics,
     travel, drama) when genuinely applicable.
   - `people`: only for multi-person works (enables shared-writer edges).
   - `spine`: bg/ink hex approximating the photo (muted, aged values), h in
     0.6–1.0 and w in 24–62 relative to neighbors, kind, optional lean.
   - Spine partly legible but identifiable → `uncertain: true` + `note` saying
     what was readable. Not identifiable at all → skip it, and list skipped
     spines in your final report.

6. **Fetch covers:** `npm run covers`. Read its full log. For every NEW book,
   check the matched title line; if a match is clearly a different work, delete
   that book's entry from `src/data/covers.json` (a placeholder is better than
   a wrong cover). Do not re-run the script after hand-deletions without
   re-checking prior deletions (the script regenerates the whole file — as of
   now, `lonely-planet-england` and `brownings-letters-poetry` must stay
   deleted).

7. **Verify:** `npm run build` must pass. Start the dev server and look at the
   new shelf row, one new book's dialog, and the constellation (new nodes
   should orbit their genre hub).

8. **Archive the photos:** `git mv photos/inbox/<file> photos/shelves/` so the
   inbox is empty again. Name them `shelf-<n>-<date>.jpg` if renaming helps.

9. **Report:** list every book added (title, author, genre, shelf), every spine
   skipped as unreadable, and any cover matches you deleted. If asked to
   commit, one commit: `Add <n> books from shelf <k> photos`.

## Style guardrails for new entries

- No em-dashes in any visible string. Straight apostrophes escaped as needed.
- Genres are singular concepts, not compounds of the moment; reuse before invent.
- Spine hex values: sample the photo's dominant cloth/paper color and darken
  toward the site's palette rather than saturating.
