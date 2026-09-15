# Shelf photos

Photos submitted through the website do not live here. They go to a private
Tigris bucket (`huggins-library-photos`) under `inbox/`, so the repository
stays code-only. Collect them with:

```sh
node scripts/fetch-submissions.mjs            # what is waiting
node scripts/fetch-submissions.mjs --pull     # download into inbox/
node scripts/fetch-submissions.mjs --archive  # move to done/ once catalogued
```

- `inbox/` — working folder for photos waiting to be catalogued, whether
  pulled from the bucket or dropped here by hand. Its contents are not
  committed.
- `shelves/` — the handful of photographs kept with the repo as a record of
  the original shelves.

The five photographs that seeded the catalog (July 2026) were processed
directly from a chat session and are not all stored here.
