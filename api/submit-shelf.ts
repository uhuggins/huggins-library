// Hands the browser short-lived presigned URLs so it can upload shelf photos
// straight to Tigris object storage. The photos never pass through this
// function, so phone-sized images are not a constraint and the repo stays
// code-only.
//
// Requires on Vercel:
//   TIGRIS_STORAGE_ACCESS_KEY_ID
//   TIGRIS_STORAGE_SECRET_ACCESS_KEY
//   TIGRIS_STORAGE_ENDPOINT   (optional, defaults to https://t3.storage.dev)
//   TIGRIS_BUCKET             (optional, defaults to huggins-library-photos)
//
// Without credentials the endpoint answers 503 and the form explains that the
// postbox is not connected yet.
//
// Uploads land under inbox/<slug>--<timestamp>-<n>.jpg so the submitter's name
// survives the trip; the cataloguing pass reads that prefix to build a shelf
// owned by that person.
//
// Everything is deliberately in this one file. Vercel builds each api/*.ts as
// its own entrypoint and does not ship sibling helper modules alongside it, so
// a relative import here fails at runtime with ERR_MODULE_NOT_FOUND.

import crypto from 'node:crypto'

const REGION = 'auto'
const SERVICE = 's3'
const MAX_PHOTOS = 12

const hmac = (key: crypto.BinaryLike, data: string): Buffer =>
  crypto.createHmac('sha256', key).update(data).digest()

const sha256 = (data: string): string => crypto.createHash('sha256').update(data).digest('hex')

// RFC 3986 escaping; encodeURIComponent leaves these unescaped.
const enc = (s: string): string =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'friend'

function presign(opts: {
  host: string
  bucket: string
  key: string
  expiresIn: number
  accessKeyId: string
  secretAccessKey: string
}): string {
  const { host, bucket, key, expiresIn, accessKeyId, secretAccessKey } = opts
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`
  const canonicalUri = `/${bucket}/${key.split('/').map(enc).join('/')}`

  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  }
  const query = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join('&')

  const canonicalRequest = ['PUT', canonicalUri, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n')

  let signing = hmac('AWS4' + secretAccessKey, date)
  signing = hmac(signing, REGION)
  signing = hmac(signing, SERVICE)
  signing = hmac(signing, 'aws4_request')
  const signature = crypto.createHmac('sha256', signing).update(stringToSign).digest('hex')

  return `https://${host}${canonicalUri}?${query}&X-Amz-Signature=${signature}`
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const { name, count, hp } = body

  // Honeypot: bots that fill the hidden field get a quiet yes and nothing happens.
  if (hp) return res.status(200).json({ uploads: [] })

  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 40) {
    return res.status(400).json({ error: 'Add a name between 1 and 40 characters.' })
  }

  const n = Number(count)
  if (!Number.isInteger(n) || n < 1 || n > MAX_PHOTOS) {
    return res.status(400).json({ error: `Send between 1 and ${MAX_PHOTOS} photos at a time.` })
  }

  const accessKeyId = process.env.TIGRIS_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) {
    return res.status(503).json({
      error: 'The postbox is not connected yet. Tell the librarian, who has one setting left to flip.',
    })
  }

  const bucket = process.env.TIGRIS_BUCKET ?? 'huggins-library-photos'
  const host = (process.env.TIGRIS_STORAGE_ENDPOINT ?? 'https://t3.storage.dev')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  try {
    const stamp = Date.now()
    const slug = slugify(name.trim())
    const uploads = Array.from({ length: n }, (_, i) => {
      const key = `inbox/${slug}--${stamp}-${i + 1}.jpg`
      return { key, url: presign({ host, bucket, key, expiresIn: 900, accessKeyId, secretAccessKey }) }
    })
    return res.status(200).json({ uploads, bucket })
  } catch (err) {
    console.error('presign failed', err)
    return res.status(500).json({ error: 'Could not open the postbox. Try again in a minute.' })
  }
}
