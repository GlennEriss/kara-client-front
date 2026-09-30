import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from '../route'
import { isFirebaseStorageUrl } from '@/utils/storedDocumentUrl'

const STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/kara.appspot.com/o/doc.pdf?alt=media&token=abc'

const request = (params: Record<string, string>) =>
  new NextRequest(`http://localhost/api/download?${new URLSearchParams(params).toString()}`)

describe('proxy de téléchargement', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('n’accepte que Firebase Storage', () => {
    expect(isFirebaseStorageUrl(STORAGE_URL)).toBe(true)
    expect(isFirebaseStorageUrl('https://kara.firebasestorage.app/o/x.pdf')).toBe(true)
    expect(isFirebaseStorageUrl('https://evil.example.com/x.pdf')).toBe(false)
    expect(isFirebaseStorageUrl('http://169.254.169.254/latest/meta-data')).toBe(false)
  })

  it('télécharge un document Storage en pièce jointe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { headers: { 'content-type': 'application/pdf' } }),
    ))

    const response = await GET(request({ url: STORAGE_URL, filename: 'doc.pdf' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toMatch(/^attachment;/)
  })

  it('refuse une adresse hors Firebase Storage sans la télécharger', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request({ url: 'https://evil.example.com/x.pdf' }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
