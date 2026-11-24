import { getStorage } from 'firebase-admin/storage'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { loadAdminAccess } from '@/domains/auth/server/admin-access'
import { canWithAccess } from '@/domains/auth/access-policy'
import { adminApp } from '@/firebase/admin'
import { adminFirestore } from '@/firebase/adminFirestore'

export const runtime = 'nodejs'

const id = 'ogar-vehicules'
const storagePath = 'insurance-reference-documents/ogar-vehicules.pdf'
const noStore = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  const caller = await requireAdminCaller(request, { allowRestricted: true })
  if (caller instanceof NextResponse) return caller
  try {
    const access = await loadAdminAccess(caller.claims)
    if (!access || !canWithAccess(access, 'vehicules.view')) {
      return NextResponse.json({ error: 'Accès au barème OGAR non autorisé.' }, { status: 403, headers: noStore })
    }
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    if (!adminApp || !adminFirestore || !bucket) throw Error('Stockage indisponible.')
    const document = await adminFirestore.collection('insurance-reference-documents').doc(id).get()
    if (!document.exists || document.data()?.storagePath !== storagePath) {
      return NextResponse.json({ error: 'Le barème OGAR est introuvable.' }, { status: 404, headers: noStore })
    }
    const [bytes] = await getStorage(adminApp).bucket(bucket).file(storagePath).download()
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        ...noStore,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="OGAR-VEHICULES.pdf"',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Le barème OGAR est momentanément indisponible.' }, { status: 503, headers: noStore })
  }
}
