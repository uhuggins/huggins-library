// Minimal SigV4 signing for Tigris (S3-compatible object storage).
//
// Server-only: this file imports node:crypto and must never be imported from
// anything under src/, or Vite would try to bundle it for the browser.
//
// Written by hand rather than pulling in @aws-sdk, which would add megabytes
// to a project whose whole dependency list is React.

import crypto from 'node:crypto'

const REGION = 'auto'
const SERVICE = 's3'

export const BUCKET = process.env.TIGRIS_BUCKET ?? 'huggins-library-photos'

const endpointHost = (): string =>
  (process.env.TIGRIS_STORAGE_ENDPOINT ?? 'https://t3.storage.dev').replace(/^https?:\/\//, '').replace(/\/$/, '')

const hmac = (key: crypto.BinaryLike | Buffer, data: string): Buffer =>
  crypto.createHmac('sha256', key).update(data).digest()

const sha256 = (data: string): string => crypto.createHash('sha256').update(data).digest('hex')

// RFC 3986 escaping; encodeURIComponent leaves these unescaped.
const enc = (s: string): string =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())

function signingKey(secret: string, date: string): Buffer {
  let k = hmac('AWS4' + secret, date)
  k = hmac(k, REGION)
  k = hmac(k, SERVICE)
  return hmac(k, 'aws4_request')
}

export function credentials(): { accessKeyId: string; secretAccessKey: string } | null {
  const accessKeyId = process.env.TIGRIS_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY
  if (!accessKeyId || !secretAccessKey) return null
  return { accessKeyId, secretAccessKey }
}

/**
 * A URL that grants one operation on one object for a limited time.
 * The browser PUTs directly to this, so photos never pass through the function.
 */
export function presign(opts: {
  method: 'PUT' | 'GET'
  key: string
  expiresIn?: number
  accessKeyId: string
  secretAccessKey: string
}): string {
  const { method, key, expiresIn = 900, accessKeyId, secretAccessKey } = opts
  const host = endpointHost()
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = amzDate.slice(0, 8)
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`
  const canonicalUri = `/${BUCKET}/${key.split('/').map(enc).join('/')}`

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

  const canonicalRequest = [method, canonicalUri, query, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n')
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n')
  const signature = crypto.createHmac('sha256', signingKey(secretAccessKey, date)).update(stringToSign).digest('hex')

  return `https://${host}${canonicalUri}?${query}&X-Amz-Signature=${signature}`
}
