import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminApp } from '@/firebase/admin'
import { adminAuth } from '@/firebase/adminAuth'
import { adminFirestore } from '@/firebase/adminFirestore'
import { getStorage } from 'firebase-admin/storage'
import { algoliasearch } from 'algoliasearch'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

/** Compte superAdmin conservé (et SEUL autorisé à purger). */
const SUPERADMIN_EMAIL = (process.env.PURGE_SUPERADMIN_EMAIL || 'phil@gmail.com').toLowerCase()
/** Phrase exacte à taper pour exécuter réellement. */
const CONFIRM_PHRASE = 'SUPPRIMER TOUT KARA'

function bucketName(): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
  )
}

function keepDoc(colId: string, doc: FirebaseFirestore.QueryDocumentSnapshot, keepUid: string): boolean {
  if (colId !== 'users' && colId !== 'admins') return false
  const data = doc.data() || {}
  const email = String(data.email || '').trim().toLowerCase()
  return doc.id === keepUid || data.id === keepUid || data.uid === keepUid || email === SUPERADMIN_EMAIL
}

async function purgeFirestore(dryRun: boolean, keepUid: string) {
  const cols = await adminFirestore!.listCollections()
  const perCollection: Record<string, number> = {}
  let deleted = 0
  let kept = 0
  for (const col of cols) {
    const snap = await col.get()
    perCollection[col.id] = snap.size
    for (const d of snap.docs) {
      if (keepDoc(col.id, d, keepUid)) {
        kept++
        continue
      }
      if (!dryRun) await adminFirestore!.recursiveDelete(d.ref)
      deleted++
    }
  }
  return { deleted, kept, perCollection }
}

async function purgeAuth(dryRun: boolean, keepUid: string) {
  const toDelete: string[] = []
  let pageToken: string | undefined
  do {
    const res = await adminAuth!.listUsers(1000, pageToken)
    for (const u of res.users) {
      if (u.uid === keepUid || (u.email || '').toLowerCase() === SUPERADMIN_EMAIL) continue
      toDelete.push(u.uid)
    }
    pageToken = res.pageToken
  } while (pageToken)

  if (dryRun) return toDelete.length

  let failures = 0
  for (let i = 0; i < toDelete.length; i += 1000) {
    const res = await adminAuth!.deleteUsers(toDelete.slice(i, i + 1000))
    failures += res.failureCount
  }
  if (failures > 0) throw new Error(`${failures} compte(s) non supprimé(s) sur ${toDelete.length}`)
  return toDelete.length
}

async function purgeStorage(dryRun: boolean) {
  try {
    const bucket = getStorage(adminApp!).bucket(bucketName())
    const [files] = await bucket.getFiles()
    if (!dryRun) await bucket.deleteFiles({ force: true })
    return { bucket: bucket.name, files: files.length }
  } catch (e) {
    return { bucket: bucketName(), files: 0, error: e instanceof Error ? e.message : 'storage error' }
  }
}

async function purgeAlgolia(dryRun: boolean) {
  const appId = process.env.ALGOLIA_APP_ID || process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
  const writeKey = process.env.ALGOLIA_WRITE_API_KEY
  if (!appId || !writeKey) return { configured: false, indices: 0 }
  try {
    const client = algoliasearch(appId, writeKey)
    const res = await client.listIndices()
    const items = res.items || []
    if (!dryRun) {
      for (const idx of items) {
        try {
          await client.clearObjects({ indexName: idx.name })
        } catch {
          // ignore index individuel
        }
      }
    }
    return { configured: true, indices: items.length, names: items.map((i) => i.name) }
  } catch (e) {
    return { configured: true, indices: 0, error: e instanceof Error ? e.message : 'algolia error' }
  }
}

export async function POST(req: NextRequest) {
  if (!adminFirestore || !adminAuth || !adminApp) {
    return NextResponse.json({ error: 'Firebase Admin non configuré' }, { status: 503 })
  }

  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }
  // RESTRICTION FORTE : seul le superAdmin (phil) peut purger.
  if (String(claims.email || '').toLowerCase() !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Action réservée au superAdmin' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    mode?: string
    confirmText?: string
    target?: string
  }
  const execute = body.mode === 'execute'
  if (execute && body.confirmText !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation invalide. Tape exactement : ${CONFIRM_PHRASE}` },
      { status: 400 },
    )
  }

  // Anti-verrouillage : phil doit exister.
  let keep
  try {
    keep = await adminAuth.getUserByEmail(SUPERADMIN_EMAIL)
  } catch {
    return NextResponse.json(
      { error: `${SUPERADMIN_EMAIL} introuvable — purge annulée (anti-verrouillage)` },
      { status: 400 },
    )
  }

  const dryRun = !execute
  const target = body.target || 'all'
  const want = (t: string) => target === 'all' || target === t

  // Chaque domaine est isolé : une erreur/lenteur sur l'un n'empêche pas les autres.
  async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | { error: string }> {
    try {
      return await fn()
    } catch (e) {
      return { error: `${label}: ${e instanceof Error ? e.message : 'erreur'}` }
    }
  }

  const out: Record<string, unknown> = {
    mode: execute ? 'execute' : 'preview',
    target,
    keptEmail: SUPERADMIN_EMAIL,
    keptUid: keep.uid,
  }

  // Ordre : les domaines rapides d'abord, Firestore (lourd) en dernier.
  if (want('storage')) out.storage = await safe('storage', () => purgeStorage(dryRun))
  if (want('algolia')) out.algolia = await safe('algolia', () => purgeAlgolia(dryRun))
  if (want('auth')) out.authUsers = await safe('auth', () => purgeAuth(dryRun, keep.uid))
  if (want('firestore')) out.firestore = await safe('firestore', () => purgeFirestore(dryRun, keep.uid))

  if (execute) {
    try {
      await adminAuth.getUserByEmail(SUPERADMIN_EMAIL)
      out.superAdminStillExists = true
    } catch {
      out.superAdminStillExists = false
    }
  }

  return NextResponse.json(out)
}
