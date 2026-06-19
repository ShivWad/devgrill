import { auth } from '@clerk/nextjs/server'
import { createRequire } from 'module'
import { NextRequest, NextResponse } from 'next/server'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { routeLogger } from '@/lib/logger'

// pdfjs-dist v6 requires a non-empty workerSrc even on the server.
// Resolve the worker file path via Node module resolution.
const _require = createRequire(import.meta.url)
pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${_require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')}`

const MAX_PDF_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const log = routeLogger({ route: 'POST /api/parse-pdf' })

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('Failed to parse form data', { userId, err: error.message })
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileSize = (file as File).size
  if (fileSize > MAX_PDF_BYTES) {
    log.warn('PDF upload rejected — file too large', { userId, fileSize })
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 413 })
  }

  log.debug('Parsing PDF', { userId, fileSize, fileName: (file as File).name })

  try {
    const buffer = new Uint8Array(await (file as File).arrayBuffer())
    const pdf = await pdfjsLib.getDocument({ data: buffer, useWorkerFetch: false }).promise

    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text = content.items
        .filter(item => 'str' in item)
        .map(item => (item as { str: string }).str)
        .join(' ')
      pages.push(text)
    }

    log.info('PDF parsed successfully', { userId, numPages: pdf.numPages })
    return NextResponse.json({ text: pages.join('\n\n') })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    log.error('PDF parsing failed', { userId, err: error.message, stack: error.stack })
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 422 })
  }
}
