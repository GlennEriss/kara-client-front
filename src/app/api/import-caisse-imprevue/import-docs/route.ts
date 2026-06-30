import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'
import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'

const SERVER_TIMESTAMP_TOKEN = '__karaServerTimestamp'
const DATE_TOKEN = '__karaDate'
const CONTRACTS = firebaseCollectionNames.contractsCI || 'contractsCI'
const CAISSE_CONTRACTS = firebaseCollectionNames.caisseContracts || 'caisseContracts'
const MEMBERSHIP_REQUESTS = firebaseCollectionNames.membershipRequests || 'membership-requests'
// `membership-requests` autorisé pour les demandes d'adhésion migrées (approuvées) :
// les règles Firestore bloquent leur création côté client, on passe par l'Admin SDK.
const ALLOWED_COLLECTIONS = new Set([CONTRACTS, CAISSE_CONTRACTS, MEMBERSHIP_REQUESTS])

type ImportDoc = {
  path: string[]
  data: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function timestampFromIso(value: unknown): Timestamp {
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) throw new Error('Date import invalide')
  return Timestamp.fromDate(date)
}

function decodeImportValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeImportValue)
  if (isRecord(value)) {
    if (value[SERVER_TIMESTAMP_TOKEN] === true) return FieldValue.serverTimestamp()
    if (typeof value[DATE_TOKEN] === 'string') return timestampFromIso(value[DATE_TOKEN])

    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue
      out[key] = decodeImportValue(val)
    }
    return out
  }
  return value
}

function validateDoc(doc: ImportDoc): string | null {
  if (!Array.isArray(doc.path) || doc.path.length < 2 || doc.path.length % 2 !== 0) {
    return 'Chemin document invalide'
  }
  if (!ALLOWED_COLLECTIONS.has(doc.path[0])) return 'Collection import non autorisee'
  if (doc.path.some((part) => typeof part !== 'string' || !part.trim() || part.includes('/'))) {
    return 'Segment de chemin invalide'
  }
  if (!isRecord(doc.data)) return 'Donnees document invalides'
  return null
}

export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configure' }, { status: 503 })
  }

  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 })
  }

  try {
    const body = (await req.json()) as { docs?: ImportDoc[] }
    const docs = body.docs || []
    if (!Array.isArray(docs) || docs.length === 0) {
      return NextResponse.json({ error: 'Aucun document a importer' }, { status: 400 })
    }
    if (docs.length > 450) {
      return NextResponse.json({ error: 'Lot import trop volumineux' }, { status: 400 })
    }

    const batch = adminFirestore.batch()
    for (const importDoc of docs) {
      const validationError = validateDoc(importDoc)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
      batch.set(adminFirestore.doc(importDoc.path.join('/')), decodeImportValue(importDoc.data) as Record<string, unknown>)
    }

    await batch.commit()

    return NextResponse.json({ success: true, written: docs.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue'
    return NextResponse.json({ error: 'Erreur import documents CI', details: message }, { status: 500 })
  }
}
