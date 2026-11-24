import { createHash } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdminCaller } from '@/domains/auth/server/requireAdminCaller'
import { loadAdminAccess } from '@/domains/auth/server/admin-access'
import {
  archiveKey, collection, documentFor, legacyId, listTariffDocuments, ogarSimulation,
  safeFilename, vehicleType, verifiedOgarDocument,
} from '@/domains/vehicles/server/tariff-archive'
import { canWithAccess } from '@/domains/auth/access-policy'
import { adminApp } from '@/firebase/admin'
import { adminFirestore } from '@/firebase/adminFirestore'

export const runtime = 'nodejs'

const maxBytes = 10 * 1024 * 1024
const noStore = { 'Cache-Control': 'private, no-store' }

function reply(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: noStore })
}

async function authorize(request: NextRequest) {
  const caller = await requireAdminCaller(request, { allowRestricted: true })
  if (caller instanceof NextResponse) return caller
  const access = await loadAdminAccess(caller.claims)
  if (!access || !canWithAccess(access, 'vehicules.view')) {
    return reply({ error: 'Accès aux barèmes non autorisé.' }, 403)
  }
  return { uid: caller.claims.uid, canPublish: canWithAccess(access, 'vehicules.edit') }
}

function archive() {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (!adminFirestore || !adminApp || !bucket) throw Error('Stockage indisponible.')
  return { documents: adminFirestore.collection(collection), bucket: getStorage(adminApp).bucket(bucket) }
}

export async function GET(request: NextRequest) {
  try {
    const access = await authorize(request)
    if (access instanceof NextResponse) return access

    const { documents, bucket } = archive()
    const id = request.nextUrl.searchParams.get('document')
    if (id !== null) {
      if (id !== legacyId && (id.length > 188 || !/^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?--[a-f0-9]{64}$/.test(id))) {
        return reply({ error: 'Barème introuvable.' }, 404)
      }
      const document = documentFor(id, (await documents.doc(id).get()).data())
      if (!document) return reply({ error: 'Barème introuvable.' }, 404)
      const [bytes] = await bucket.file(document.storagePath).download()
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          ...noStore,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${document.filename}"`,
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    const archiveItems = await listTariffDocuments(documents)
    if (request.nextUrl.searchParams.get('simulation') === 'ogar') {
      return reply(ogarSimulation(verifiedOgarDocument(archiveItems)))
    }
    const items = archiveItems.map(({ id, insurerId, insurer, assetTypeId, assetType, filename, importedAt }) =>
      ({ id, insurerId, insurer, assetTypeId, assetType, filename, importedAt }))
    return reply({ items, canPublish: access.canPublish })
  } catch {
    return reply({ error: 'Les barèmes sont momentanément indisponibles.' }, 503)
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    const site = request.headers.get('sec-fetch-site')
    if (site ? site !== 'same-origin' : origin && origin !== request.nextUrl.origin) {
      return reply({ error: 'Origine de la demande non autorisée.' }, 403)
    }
    const access = await authorize(request)
    if (access instanceof NextResponse) return access
    if (!access.canPublish) return reply({ error: 'Vous ne pouvez pas publier un barème.' }, 403)
    if (Number(request.headers.get('content-length')) > maxBytes + 16 * 1024) {
      return reply({ error: 'Le PDF doit peser au maximum 10 Mo.' }, 413)
    }

    const form = await request.formData().catch(() => null)
    const name = form?.get('insurer')
    const type = form?.get('assetType')
    const file = form?.get('file')
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 60 || !archiveKey(name)) {
      return reply({ error: 'Indiquez le nom de l’assureur.' }, 400)
    }
    if (typeof type !== 'string' || !type.trim() || type.trim().length > 60 || !archiveKey(type)) {
      return reply({ error: 'Indiquez le type de bien couvert par le barème.' }, 400)
    }
    if (!file || typeof file === 'string' || !file.size || file.size > maxBytes) {
      return reply({ error: 'Choisissez un PDF de 10 Mo maximum.' }, 400)
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.subarray(0, 5).toString() !== '%PDF-') {
      return reply({ error: 'Le fichier sélectionné doit être un PDF.' }, 400)
    }
    const insurer = name.trim().replace(/\s+/g, ' ')
    const insurerId = archiveKey(insurer)
    const assetType = type.trim().replace(/\s+/g, ' ')
    const assetTypeId = archiveKey(assetType)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const id = `${insurerId}--${assetTypeId}--${sha256}`
    const storagePath = `${collection}/${insurerId}/${assetTypeId}/${sha256}.pdf`
    const { documents, bucket } = archive()

    if (assetTypeId === vehicleType.id) {
      const previousId = `${insurerId}--${sha256}`
      if ((await documents.doc(previousId).get()).exists) return reply({ id: previousId, duplicate: true })
      if (insurerId === 'ogar') {
        const existing = await documents.doc(legacyId).get()
        if (existing.data()?.sha256 === sha256) return reply({ id: legacyId, duplicate: true })
      }
    }
    const ref = documents.doc(id)
    if ((await ref.get()).exists) return reply({ id, duplicate: true })

    try {
      await bucket.file(storagePath).save(bytes, {
        resumable: false,
        metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' },
        preconditionOpts: { ifGenerationMatch: 0 },
      })
    } catch (error) {
      if (Number((error as { code?: unknown }).code) !== 412) throw error
    }

    try {
      await ref.create({
        insurerId,
        insurer,
        assetTypeId,
        assetType,
        filename: safeFilename(file.name),
        size: file.size,
        sha256,
        storagePath,
        importedBy: access.uid,
        importedAt: FieldValue.serverTimestamp(),
      })
    } catch (error) {
      if (Number((error as { code?: unknown }).code) !== 6) throw error
      return reply({ id, duplicate: true })
    }
    return reply({ id }, 201)
  } catch {
    return reply({ error: 'Impossible de publier le barème. Réessayez.' }, 503)
  }
}
