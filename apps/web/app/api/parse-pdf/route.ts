import { auth } from '@clerk/nextjs/server'
import { createRequire } from 'module'
import { NextRequest, NextResponse } from 'next/server'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

// pdfjs-dist v6 requires a non-empty workerSrc even on the server.
// Resolve the worker file path via Node module resolution.
const _require = createRequire(import.meta.url)
pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${_require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')}`

const MAX_PDF_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if ((file as File).size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 413 })
  }

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

    return NextResponse.json({ text: pages.join('\n\n') })
  } catch (e) {
    console.error('PDF parse error:', e)
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 422 })
  }
}
