// Lists and downloads shelf photos submitted through the website.
//
// Photos live in Tigris object storage under inbox/, named
//   inbox/<slug>--<timestamp>-<n>.jpg
// so the submitter's name survives the trip. This script pulls them into
// photos/inbox/ so the cataloguing pass can read them like any other photo.
//
// Usage:
//   node scripts/fetch-submissions.mjs            list what is waiting
//   node scripts/fetch-submissions.mjs --pull     download them
//   node scripts/fetch-submissions.mjs --archive  move pulled objects to done/
//
// Credentials come from the environment or a local .env.local (gitignored):
//   TIGRIS_STORAGE_ACCESS_KEY_ID
//   TIGRIS_STORAGE_SECRET_ACCESS_KEY
//   TIGRIS_STORAGE_ENDPOINT   (optional)
//   TIGRIS_BUCKET             (optional)

import crypto from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load .env.local without adding a dependency.
const envFile = join(root, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const ACCESS_KEY = process.env.TIGRIS_STORAGE_ACCESS_KEY_ID
const SECRET_KEY = process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY
const BUCKET = process.env.TIGRIS_BUCKET ?? 'huggins-library-photos'
const HOST = (process.env.TIGRIS_STORAGE_ENDPOINT ?? 'https://t3.storage.dev')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
const REGION = 'auto'
const SERVICE = 's3'

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing Tigris credentials. Set them in the environment or .env.local.')
  process.exit(1)
}

const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest()
const sha256 = (d) => crypto.createHash('sha256').update(d).digest('hex')
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

function signingKey(date) {
  let k = hmac('AWS4' + SECRET_KEY, date)
  k = hmac(k, REGION)
  k = hmac(k, SERVICE)
  return hmac(k, 'aws4_request')
}

async function signed(method, { key = '', query = '', body = '', extraHeaders = {} } = {}) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const payload = sha256(body)
  const uri = key ? `/${BUCKET}/${key.split('/').map(enc).join('/')}` : `/${BUCKET}`

  const headers = { host: HOST, 'x-amz-content-sha256': payload, 'x-amz-date': amzDate, ...extraHeaders }
  const names = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort()
  const canonicalHeaders = names.map((h) => `${h}:${headers[Object.keys(headers).find((k) => k.toLowerCase() === h)]}`).join('\n')
  const signedHeaders = names.join(';')

  const cr = [method, uri, query, canonicalHeaders, '', signedHeaders, payload].join('\n')
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`
  const sts = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(cr)].join('\n')
  const sig = crypto.createHmac('sha256', signingKey(date)).update(sts).digest('hex')

  return fetch(`https://${HOST}${uri}${query ? '?' + query : ''}`, {
    method,
    headers: {
      ...extraHeaders,
      Authorization: `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${sig}`,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payload,
    },
    body: body || undefined,
  })
}

async function listInbox() {
  const res = await signed('GET', { query: 'list-type=2&prefix=inbox%2F' })
  if (!res.ok) throw new Error(`list failed: HTTP ${res.status}`)
  const xml = await res.text()
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)]
    .map((m) => m[1])
    .filter((k) => k.endsWith('.jpg'))
}

const submitterOf = (key) => {
  const base = key.replace(/^inbox\//, '')
  const slug = base.split('--')[0] ?? 'friend'
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const keys = await listInbox()

if (keys.length === 0) {
  console.log('Nothing waiting in the bucket inbox.')
  process.exit(0)
}

const bySubmitter = new Map()
for (const k of keys) bySubmitter.set(submitterOf(k), [...(bySubmitter.get(submitterOf(k)) ?? []), k])

console.log(`${keys.length} photo${keys.length === 1 ? '' : 's'} waiting:\n`)
for (const [who, theirs] of bySubmitter) {
  console.log(`  ${who}: ${theirs.length}`)
  for (const k of theirs) console.log(`    ${k}`)
}

if (process.argv.includes('--pull')) {
  const dest = join(root, 'photos/inbox')
  mkdirSync(dest, { recursive: true })
  console.log('')
  for (const key of keys) {
    const res = await signed('GET', { key })
    if (!res.ok) {
      console.log(`  failed ${key}: HTTP ${res.status}`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const name = key.replace(/^inbox\//, '')
    writeFileSync(join(dest, name), buf)
    console.log(`  pulled ${name} (${Math.round(buf.length / 1024)} KB)`)
  }
  console.log('\nPhotos are in photos/inbox/. Catalogue them with the /add-books skill.')
}

if (process.argv.includes('--archive')) {
  console.log('')
  for (const key of keys) {
    const doneKey = key.replace(/^inbox\//, 'done/')
    const copy = await signed('PUT', {
      key: doneKey,
      extraHeaders: { 'x-amz-copy-source': `/${BUCKET}/${key}` },
    })
    if (!copy.ok) {
      console.log(`  copy failed ${key}: HTTP ${copy.status}`)
      continue
    }
    const del = await signed('DELETE', { key })
    console.log(`  archived ${key} -> ${doneKey} (delete ${del.status})`)
  }
}
