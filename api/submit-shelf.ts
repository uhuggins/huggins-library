// Hands the browser a short-lived presigned URL so it can upload a shelf photo
// straight to Tigris object storage. The photo never passes through this
// function, so phone-sized images are not a constraint and the repo stays
// code-only.
//
// Requires three Vercel environment variables:
//   TIGRIS_STORAGE_ACCESS_KEY_ID
//   TIGRIS_STORAGE_SECRET_ACCESS_KEY
//   TIGRIS_STORAGE_ENDPOINT        (optional, defaults to https://t3.storage.dev)
//   TIGRIS_BUCKET                  (optional, defaults to huggins-library-photos)
//
// Without credentials the endpoint answers 503 and the form explains that the
// postbox is not connected yet.
//
// Uploads land under inbox/, named so the submitter's name survives:
//   inbox/<slug>--<timestamp>-<n>.jpg
// The cataloguing pass reads that prefix to build a shelf owned by that person.

import { BUCKET, credentials, presign } from './_tigris'

const MAX_PHOTOS = 12

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'friend'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const { name, count, hp } = req.body ?? {}

  // Honeypot: bots that fill the hidden field get a quiet yes and nothing happens.
  if (hp) return res.status(200).json({ uploads: [] })

  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 40) {
    return res.status(400).json({ error: 'Add a name between 1 and 40 characters.' })
  }

  const n = Number(count)
  if (!Number.isInteger(n) || n < 1 || n > MAX_PHOTOS) {
    return res.status(400).json({ error: `Send between 1 and ${MAX_PHOTOS} photos at a time.` })
  }

  const creds = credentials()
  if (!creds) {
    return res.status(503).json({
      error: 'The postbox is not connected yet. Tell the librarian, who has one setting left to flip.',
    })
  }

  const stamp = Date.now()
  const slug = slugify(name.trim())

  try {
    const uploads = Array.from({ length: n }, (_, i) => {
      const key = `inbox/${slug}--${stamp}-${i + 1}.jpg`
      return { key, url: presign({ method: 'PUT', key, expiresIn: 900, ...creds }) }
    })
    return res.status(200).json({ uploads, bucket: BUCKET })
  } catch (err) {
    console.error('presign failed', err)
    return res.status(500).json({ error: 'Could not open the postbox. Try again in a minute.' })
  }
}
