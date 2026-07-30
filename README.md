# The Huggins Library

A catalog of the books on our shelves, made from photographs of their spines.

**Browse it: https://huggins-library.vercel.app**

Point a camera at a shelf and the library grows. Every legible spine becomes a
record with its cover art, its writer, its year, and its place on the shelf.
The site shows the collection four ways:

- **The shelves**, drawn as shelves: rows of three-dimensional spines in their
  real colors and sizes. Pull one out and it turns its cover toward you.
- **The collection**, a searchable grid of covers you can filter by section.
- **The ledger**, where the library is counted: sections, eras, and spans.
- **The constellation**, a night sky of the whole collection. Books orbit
  their genres, gold lines follow a writer from book to book, and dotted
  threads trace the currents that run through the shelves: Ireland,
  Cambridge, fishing, the stars.

## Adding books

1. Photograph a shelf straight on, one shelf per frame, spines filling the
   picture.
2. Put the photos in the inbox:
   [upload to photos/inbox](https://github.com/uhuggins/huggins-library/upload/main/photos/inbox)
   works straight from a phone.
3. Have Claude catalog them: open this folder and run `claude "/add-books"`.
   It reads the spines, fetches the covers, and every view of the site
   updates from the catalog.

## A few honest notes

The catalog never invents a book. Spines too worn to read are skipped, and
records built from a partly legible spine say so. Cover art and publication
records come from Open Library; spine colors are approximations sampled from
the photographs; a handful of covers are the same work under a different
edition's title.

Curious how it works? See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the
day-to-day mechanics and [docs/BUILD-SPEC.md](docs/BUILD-SPEC.md) for the full
design specification.
