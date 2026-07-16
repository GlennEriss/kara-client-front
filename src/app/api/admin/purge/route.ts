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
/** Phrase exacte à taper pour exécuter réellement (purge globale/domaine). */
const CONFIRM_PHRASE = 'SUPPRIMER TOUT KARA'

/**
 * Réinitialisation par SECTION métier : chaque section liste ses collections
 * Firestore de premier niveau (les sous-collections sont supprimées en cascade
 * via recursiveDelete). N'affecte ni Auth, ni Storage, ni Algolia.
 */
interface SectionDef {
  label: string
  /** Collections Firestore de premier niveau (sous-collections en cascade). */
  collections: string[]
  /** Valeur `sourceType` des versements centralisés (collection `payments`) à purger. */
  paymentsSourceType?: string
  /** Préfixes Storage possédés en propre par la section (fichiers supprimés). */
  storagePrefixes?: string[]
  /** Champ tableau de back-références à vider sur les fiches `users`. */
  userBackRefField?: string
}

const SECTIONS: Record<string, SectionDef> = {
  caisseImprevue: {
    label: 'Caisse Imprévue',
    collections: ['contractsCI', 'caisseImprevueDemands', 'subscriptionsCI'],
    paymentsSourceType: 'caisse-imprevue',
    storagePrefixes: [
      'contracts-ci/',
      'emergency-contacts-ci/',
      'emergency-contact-ci/',
      'contrat-signe-ci/',
      'declared-versement-proof/',
      'early-refund-proof/',
      'final-refund-proof/',
      'early-refund-signed/',
      'final-refund-signed/',
      'support-ci-signed/',
    ],
  },
  caisseSpeciale: {
    label: 'Caisse Spéciale',
    collections: ['caisseContracts', 'caisseSpecialeDemands', 'caisseSettings', 'caisseAdminNotes'],
    paymentsSourceType: 'caisse-speciale',
    storagePrefixes: [
      'contracts/',
      'caisse/',
      'contracts-cs/',
      'contract-documents/',
      'emergency-contacts/',
      'cs-declared-versement-proof/',
      'cs-early-refund-proof/',
      'cs-final-refund-proof/',
      'cs-early-refund-signed/',
      'cs-final-refund-signed/',
      'contrat-signe-cs/',
    ],
    userBackRefField: 'caisseContractIds',
  },
  placements: {
    label: 'Placements',
    collections: ['placements', 'placementDemands'],
    paymentsSourceType: 'placement',
  },
  credit: {
    label: 'Crédit Spéciale',
    collections: [
      'creditDemands',
      'creditContracts',
      'creditInstallments',
      'creditPayments',
      'creditPenalties',
      'guarantorRemunerations',
      'guarantorPayments',
    ],
    paymentsSourceType: 'credit-speciale',
    storagePrefixes: ['credit/', 'credit-contracts/'],
  },
  bienfaiteur: {
    label: 'Bienfaiteur',
    collections: ['charity-events', 'charityContributions', 'member-charity-summary'],
    storagePrefixes: ['charity-events/'],
  },
  membres: {
    label: 'Membres (demandes & adhésions)',
    collections: ['members', 'membership-requests', 'subscriptions', 'groups'],
    paymentsSourceType: 'membership-request',
    storagePrefixes: [
      'membership-photos/',
      'membership-documents/',
      'membership-adhesion-pdfs/',
      'membership-request-profile-photo/',
      'membership-request-document-front/',
      'membership-request-document-back/',
      'member-photos/',
      'member-id-documents/',
    ],
  },
  evenements: {
    label: 'Événements',
    collections: ['events', 'news'],
    storagePrefixes: ['events/images/'],
  },
  boutiques: {
    label: 'Boutiques',
    collections: ['shops'],
    storagePrefixes: ['shops/'],
  },
}

/** Phrase de confirmation attendue pour une section (ex. « RÉINITIALISER CAISSE IMPRÉVUE »). */
function sectionConfirmPhrase(label: string): string {
  return `RÉINITIALISER ${label.toUpperCase()}`
}

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
  return purgeFirestoreCollections(dryRun, keepUid, cols.map((c) => c.id))
}

/** Purge uniquement les collections nommées (sous-collections en cascade). */
async function purgeFirestoreCollections(dryRun: boolean, keepUid: string, names: string[]) {
  const perCollection: Record<string, number> = {}
  let deleted = 0
  let kept = 0
  for (const name of names) {
    const snap = await adminFirestore!.collection(name).get()
    perCollection[name] = snap.size
    for (const d of snap.docs) {
      if (keepDoc(name, d, keepUid)) {
        kept++
        continue
      }
      if (!dryRun) await adminFirestore!.recursiveDelete(d.ref)
      deleted++
    }
  }
  return { deleted, kept, perCollection }
}

/** Purge les versements centralisés (collection `payments`) d'une section. */
async function purgePaymentsBySourceType(dryRun: boolean, sourceType: string) {
  const snap = await adminFirestore!.collection('payments').where('sourceType', '==', sourceType).get()
  if (!dryRun) {
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += 400) {
      const batch = adminFirestore!.batch()
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  return { deleted: snap.size }
}

/** Supprime les fichiers Storage sous les préfixes propres à la section. */
async function purgeStoragePrefixes(dryRun: boolean, prefixes: string[]) {
  const bucket = getStorage(adminApp!).bucket(bucketName())
  const perPrefix: Record<string, number> = {}
  let files = 0
  for (const prefix of prefixes) {
    try {
      const [list] = await bucket.getFiles({ prefix })
      perPrefix[prefix] = list.length
      files += list.length
      if (!dryRun && list.length > 0) await bucket.deleteFiles({ prefix, force: true })
    } catch (e) {
      perPrefix[prefix] = -1
      if (files === 0) return { bucket: bucket.name, files, perPrefix, error: e instanceof Error ? e.message : 'storage error' }
    }
  }
  return { bucket: bucket.name, files, perPrefix }
}

/** Vide un tableau de back-références (ex. caisseContractIds) sur toutes les fiches users. */
async function clearUserBackRefs(dryRun: boolean, field: string) {
  const snap = await adminFirestore!.collection('users').get()
  const affected = snap.docs.filter((d) => {
    const v = (d.data() as Record<string, unknown>)[field]
    return Array.isArray(v) && v.length > 0
  })
  if (!dryRun) {
    for (let i = 0; i < affected.length; i += 400) {
      const batch = adminFirestore!.batch()
      affected.slice(i, i + 400).forEach((d) => batch.update(d.ref, { [field]: [] }))
      await batch.commit()
    }
  }
  return { cleared: affected.length }
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
  const target = body.target || 'all'
  const section = SECTIONS[target]
  // La phrase de confirmation dépend de la cible : globale ou spécifique à la section.
  const expectedPhrase = section ? sectionConfirmPhrase(section.label) : CONFIRM_PHRASE
  if (execute && body.confirmText !== expectedPhrase) {
    return NextResponse.json(
      { error: `Confirmation invalide. Tape exactement : ${expectedPhrase}` },
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

  // Réinitialisation par section : collections Firestore + versements centralisés
  // + fichiers Storage liés + back-références membres (tout ce qui appartient à
  // la section, sans toucher les autres).
  if (section) {
    out.sectionLabel = section.label
    out.firestore = await safe('firestore', () =>
      purgeFirestoreCollections(dryRun, keep.uid, section.collections),
    )
    if (section.paymentsSourceType) {
      out.payments = await safe('payments', () =>
        purgePaymentsBySourceType(dryRun, section.paymentsSourceType!),
      )
    }
    if (section.storagePrefixes?.length) {
      out.storage = await safe('storage', () => purgeStoragePrefixes(dryRun, section.storagePrefixes!))
    }
    if (section.userBackRefField) {
      out.backRefs = await safe('backRefs', () => clearUserBackRefs(dryRun, section.userBackRefField!))
    }
    return NextResponse.json(out)
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
