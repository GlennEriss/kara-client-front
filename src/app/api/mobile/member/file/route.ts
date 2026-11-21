import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import StatutsPDF from '@/components/statuts/StatutsKaraPDF'
import ReglementPDF from '@/components/statuts/ReglementInterieurPDF'
import { nativePdfLogo } from '@/domains/mobile-admin/server/pdf-logo'
import {
  personalDocumentSource,
  memberOfficialDocument,
} from '@/domains/member-mobile/server/documents'
import { MemberError } from '@/domains/member-mobile/server/data'
import {memberCharityReceiptSource} from '@/domains/member-mobile/server/solidarity'
import { getStorage } from 'firebase-admin/storage'
import { adminApp } from '@/firebase/admin'
import { adminFirestore } from '@/firebase/adminFirestore'
import { requireMemberCaller } from '@/domains/member-mobile/server/access'
import { memberProfile } from '@/domains/member-mobile/server/read-model'
import { mobileJson } from '@/domains/mobile/server/access'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const caller = await requireMemberCaller(request)
  if (caller instanceof NextResponse) return caller
  try {
    const kind = request.nextUrl.searchParams.get('kind'),
      id = request.nextUrl.searchParams.get('id') || ''
    if (kind === 'official') {
      const document = await memberOfficialDocument(adminFirestore!, id)
      const bytes = await renderToBuffer(
        createElement<any>(id === 'statuts' ? StatutsPDF : ReglementPDF, {
          fillData: document.publication ?? undefined,
          logoSrc: await nativePdfLogo(),
        }),
      )
      return mobileJson({
        base64: bytes.toString('base64'),
        mime: 'application/pdf',
        filename: `LE-KARA-${id}.pdf`,
      })
    }
    let source = '',
      name = ''
    if(kind === 'charity'){
      const file=await memberCharityReceiptSource(adminFirestore!,caller,id)
      source=file.url;name=file.name
    } else if (['document', 'adhesion-user'].includes(kind || '')) {
      const file = await personalDocumentSource(
        adminFirestore!,
        caller,
        kind!,
        id,
      )
      source = file.url
      name = file.name
    } else if (kind === 'profile' && ['front', 'back'].includes(id)) {
      const docs = memberProfile(caller).documents
      source =
        id === 'front' ? docs.documentPhotoFrontURL : docs.documentPhotoBackURL
      name = `identite-${id}`
    } else if (kind === 'subscription' && /^[\w.-]{1,200}$/.test(id)) {
      const doc = await adminFirestore!
          .collection('subscriptions')
          .doc(id)
          .get(),
        data = doc.data()
      if (!data || ![caller.uid, caller.matricule].includes(data.userId))
        return mobileJson({ error: 'Document introuvable.' }, 404)
      source =
        typeof data.adhesionPdfURL === 'string' ? data.adhesionPdfURL : ''
      name = `adhesion-${id}`
    } else return mobileJson({ error: 'Document inconnu.' }, 400)
    if (!source) return mobileJson({ error: 'Document non fourni.' }, 404)
    const url = new URL(source),
      bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ''
    let path = ''
    if (url.protocol === 'https:' && !url.username && !url.password && bucket) {
      if (
        url.hostname === 'firebasestorage.googleapis.com' &&
        url.pathname.startsWith(`/v0/b/${bucket}/o/`)
      )
        path = decodeURIComponent(
          url.pathname.slice(`/v0/b/${bucket}/o/`.length),
        )
      if (
        url.hostname === 'storage.googleapis.com' &&
        url.pathname.startsWith(`/${bucket}/`)
      )
        path = decodeURIComponent(url.pathname.slice(bucket.length + 2))
    }
    if (!path || !adminApp)
      return mobileJson({ error: 'Source de document non autorisée.' }, 400)
    const file = getStorage(adminApp).bucket(bucket).file(path),
      [meta] = await file.getMetadata()
    const types: Record<string, string> = {
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          'xlsx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          'docx',
        'application/msword': 'doc',
        'text/plain': 'txt',
        'text/csv': 'csv',
      },
      mime = meta.contentType || ''
    if (
      !types[mime] ||
      !Number.isFinite(Number(meta.size)) ||
      Number(meta.size) > 20 * 1024 * 1024
    )
      return mobileJson({ error: 'Format ou taille non pris en charge.' }, 400)
    const [buffer] = await file.download()
    return mobileJson({
      base64: buffer.toString('base64'),
      mime,
      filename: `${Array.from(name)
        .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
        .join('')
        .replace(/[\\/:*?"<>|]/g, '_')
        .slice(0, 140)}.${types[mime]}`,
    })
  } catch (error) {
    if (error instanceof MemberError)
      return mobileJson({ error: error.message }, error.status)
    return mobileJson(
      { error: 'Impossible de lire le document. Réessayez.' },
      503,
    )
  }
}
