// Receives a shelf photo from the website's "Add to the library" form and
// commits it to photos/inbox/ in this repo, which triggers the cataloguing
// workflow. Nothing appears on the site until the resulting pull request is
// reviewed and merged.
//
// Requires one Vercel environment variable:
//   GITHUB_CONTENT_TOKEN  a fine-grained personal access token with
//                         Contents read/write on uhuggins/huggins-library
//
// Without the token the endpoint answers 503 and the form explains that the
// postbox is not connected yet.

const REPO = 'uhuggins/huggins-library'
const MAX_BYTES = 4_000_000

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

  const { name, photo, hp } = req.body ?? {}

  // Honeypot field: bots that fill it get a quiet yes and nothing happens.
  if (hp) return res.status(200).json({ ok: true })

  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 40) {
    return res.status(400).json({ error: 'Add a name between 1 and 40 characters.' })
  }
  if (typeof photo !== 'string' || !photo.startsWith('data:image/jpeg;base64,')) {
    return res.status(400).json({ error: 'The photo did not arrive as a JPEG.' })
  }

  const b64 = photo.slice('data:image/jpeg;base64,'.length)
  const approxBytes = Math.floor(b64.length * 0.75)
  if (approxBytes > MAX_BYTES) {
    return res.status(413).json({ error: 'That photo is too large even after shrinking. Try a closer crop.' })
  }
  const head = Buffer.from(b64.slice(0, 12), 'base64')
  if (head[0] !== 0xff || head[1] !== 0xd8) {
    return res.status(400).json({ error: 'The file does not look like a JPEG.' })
  }

  const token = process.env.GITHUB_CONTENT_TOKEN
  if (!token) {
    return res.status(503).json({
      error: 'The postbox is not connected yet. Tell the librarian, who has one setting left to flip.',
    })
  }

  const cleanName = name.trim()
  const path = `photos/inbox/${slugify(cleanName)}--${Date.now()}.jpg`

  const gh = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'huggins-library-postbox',
    },
    body: JSON.stringify({
      message: `Shelf photo from ${cleanName}, via the website`,
      content: b64,
    }),
  })

  if (!gh.ok) {
    const detail = await gh.text().catch(() => '')
    console.error('GitHub commit failed', gh.status, detail.slice(0, 300))
    return res.status(502).json({ error: 'The inbox did not accept the photo. Try again in a minute.' })
  }

  return res.status(200).json({ ok: true })
}
