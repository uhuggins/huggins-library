import { useRef, useState } from 'react'

// Photos are shrunk in the browser before upload so phone shots travel fast:
// longest edge capped, re-encoded as JPEG. They then go straight to object
// storage using a short-lived URL the server hands back, so the photo never
// passes through the site itself.
const MAX_EDGE = 2400
const MAX_PHOTOS = 12

async function shrinkToJpeg(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) throw new Error('encode failed')
    return blob
  } catch {
    // Some browsers cannot decode HEIC; send the original if it is already a
    // reasonable JPEG.
    if (file.type === 'image/jpeg') return file
    throw new Error(`Could not read ${file.name}. A plain JPEG works best.`)
  }
}

type FormState = 'idle' | 'sending' | 'done' | 'error'

export default function AddBooks() {
  const [name, setName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [state, setState] = useState<FormState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [sentCount, setSentCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setState('idle')
    setError('')
    setProgress(0)
    setFiles([])
    setName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const fail = (message: string) => {
    setError(message)
    setState('error')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    if (!name.trim()) return fail('Add your name, so the shelf can be yours.')
    if (files.length === 0) return fail('Choose at least one photo of your shelf.')
    if (files.length > MAX_PHOTOS) return fail(`Send up to ${MAX_PHOTOS} photos at a time.`)

    setState('sending')
    setError('')
    setProgress(0)

    try {
      // Ask for one upload slot per photo.
      const res = await fetch('/api/submit-shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), count: files.length, hp: '' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'The upload did not go through. Try again in a minute.')
      }
      const { uploads } = (await res.json()) as { uploads: { key: string; url: string }[] }
      if (!uploads?.length) throw new Error('The postbox did not open. Try again in a minute.')

      for (let i = 0; i < files.length; i++) {
        setProgress(i + 1)
        const blob = await shrinkToJpeg(files[i])
        const put = await fetch(uploads[i].url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        })
        if (!put.ok) throw new Error('One of the photos did not upload. Try again in a minute.')
      }

      setSentCount(files.length)
      setState('done')
    } catch (err) {
      fail(err instanceof Error ? err.message : 'The upload did not go through. Try again in a minute.')
    }
  }

  return (
    <section id="add" aria-label="Add to the library">
      <header className="section-head" data-reveal>
        <h2>Add your shelf</h2>
        <p>
          Anyone can put a shelf in the library. Photograph your bookshelf, send it in, and it becomes a shelf here
          under your name, every legible spine catalogued.
        </p>
      </header>

      <div className="add-grid">
        {state === 'done' ? (
          <div className="shelf-form form-done">
            <h3>Thank you, {name.trim()}.</h3>
            <p>
              {sentCount === 1 ? 'Your photo is' : `Your ${sentCount} photos are`} in the librarian&rsquo;s inbox.
              Once the spines are read and the record is approved, your shelf appears here with your name on it.
            </p>
            <button type="button" className="show-more-btn" onClick={reset}>
              Send another shelf
            </button>
          </div>
        ) : (
          <form className="shelf-form" onSubmit={submit}>
            <div className="form-field">
              <label htmlFor="shelf-name">Whose shelf is this?</label>
              <input
                id="shelf-name"
                className="form-input"
                type="text"
                autoComplete="name"
                maxLength={40}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="shelf-photos">Shelf photos</label>
              <input
                id="shelf-photos"
                ref={fileRef}
                className="form-file"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <p className="form-hint">One shelf per photo. From a phone, this opens your camera or photo roll.</p>
            </div>
            <input type="text" name="hp" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
            {state === 'error' && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="show-more-btn form-submit" disabled={state === 'sending'}>
              {state === 'sending' ? `Sending photo ${progress} of ${files.length}…` : 'Send it to the library'}
            </button>
            <p className="form-fine">
              Photos go to the librarian for review. New shelves appear after the catalog entry is checked and
              approved.
            </p>
          </form>
        )}

        <aside className="shoot-guide">
          <h3>How to shoot a shelf</h3>
          <ul>
            <li>Stand square to the shelf, not at an angle.</li>
            <li>One shelf row per frame, spines filling the picture.</li>
            <li>Mind the glare; a small sideways step usually clears it.</li>
            <li>Worn spines are fine. Whatever cannot be read is skipped, never guessed.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}
