import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Correction du décalage J-1 des dates des imports Excel.
 *
 * Contexte : le lecteur Excel produisait, sur les fuseaux UTC+ (dont le Gabon),
 * un instant à ~23h59 la VEILLE du jour voulu ; toutes les dates issues de
 * l'import ont donc été enregistrées avec un jour de moins. Le parseur est
 * désormais corrigé pour les futurs imports ; cette route rattrape l'existant.
 *
 * Sûreté :
 *  - Ne touche QUE les documents marqués `isMigrated == true`.
 *  - Idempotent : chaque document corrigé reçoit `dateShiftFixedAt` ; un
 *    document déjà marqué est ignoré (pas de double décalage).
 *  - `dryRun: true` ne modifie rien, il compte seulement.
 */

const CONTRACTS_CI = 'contractsCI'
const CAISSE_CONTRACTS = 'caisseContracts'
const USERS = 'users'

/** Champs Date/Timestamp d'origine import (à décaler), au niveau document. */
const DATE_FIELDS = new Set([
  'paidAt',
  'dueAt',
  'withdrawalDate',
  'deadlineAt',
  'processedAt',
  'requestedAt',
  'repaidAt',
])
/** Champs Date/Timestamp à décaler à l'intérieur des tableaux versements/contribs. */
const ARRAY_DATE_FIELDS = new Set(['createdAt', 'paidAt', 'date', 'dueAt', 'processedAt'])
/** Jamais décalés (horodatage réel de l'import, pas une date métier). */
const NEVER_SHIFT = new Set(['createdAt', 'updatedAt', 'importedAt', 'dateShiftFixedAt'])

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/** "YYYY-MM-DD" → même format, +1 jour (calcul en UTC pour éviter tout fuseau). */
function shiftDateOnlyString(s: string): string {
  const d = new Date(`${s}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function isTimestamp(v: unknown): v is Timestamp {
  return v instanceof Timestamp || (typeof (v as { toDate?: unknown })?.toDate === 'function')
}

function shiftTimestamp(v: Timestamp): Timestamp {
  return Timestamp.fromMillis(v.toMillis() + ONE_DAY_MS)
}

/**
 * Décale récursivement les dates d'un document. Retourne { value, changed }.
 * @param inArrayElement true quand on parcourt un élément d'un tableau versements/contribs.
 */
function shiftDates(value: unknown, keyName: string | null, inArrayElement: boolean): { value: unknown; changed: boolean } {
  // Chaîne date seule "YYYY-MM-DD" : toujours d'origine import → +1 jour.
  if (typeof value === 'string' && DATE_ONLY_RE.test(value)) {
    return { value: shiftDateOnlyString(value), changed: true }
  }

  // Timestamp/Date : au niveau document, seuls les champs métier connus (jamais
  // createdAt/updatedAt = horodatage de l'import). Dans un élément de tableau
  // versements/contribs, createdAt/paidAt sont AU CONTRAIRE des dates métier.
  if (isTimestamp(value)) {
    const shouldShift = inArrayElement
      ? keyName != null && ARRAY_DATE_FIELDS.has(keyName)
      : keyName != null && !NEVER_SHIFT.has(keyName) && DATE_FIELDS.has(keyName)
    return shouldShift ? { value: shiftTimestamp(value as Timestamp), changed: true } : { value, changed: false }
  }

  // Tableau : les éléments de versements/contribs sont marqués inArrayElement.
  if (Array.isArray(value)) {
    const childInArray = keyName === 'versements' || keyName === 'contribs'
    let changed = false
    const next = value.map((item) => {
      const r = shiftDates(item, null, childInArray)
      if (r.changed) changed = true
      return r.value
    })
    return { value: changed ? next : value, changed }
  }

  // Objet : on ne descend jamais dans le marqueur `migration`.
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    let changed = false
    const next: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'migration') {
        next[k] = v
        continue
      }
      const r = shiftDates(v, k, inArrayElement)
      if (r.changed) changed = true
      next[k] = r.value
    }
    return { value: changed ? next : value, changed }
  }

  return { value, changed: false }
}

/** Recalcule les champs anniversaire à partir d'une birthDate "YYYY-MM-DD" (UTC). */
function birthdayFields(birthDate: unknown): Record<string, number> | null {
  if (typeof birthDate !== 'string' || !DATE_ONLY_RE.test(birthDate)) return null
  const d = new Date(`${birthDate}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  return {
    birthMonth: d.getUTCMonth() + 1,
    birthDay: d.getUTCDate(),
    birthDayOfYear: Math.floor((d.getTime() - start) / ONE_DAY_MS),
  }
}

interface CollectionReport {
  scanned: number
  fixed: number
  alreadyFixed: number
}

export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configuré' }, { status: 503 })
  }
  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  const db = adminFirestore
  const body = (await req.json().catch(() => ({}))) as { dryRun?: boolean; sourceFile?: string }
  const dryRun = body.dryRun !== false // par défaut : simulation
  const sourceFile = body.sourceFile?.trim() || null

  const stamp = { dateShiftFixedAt: FieldValue.serverTimestamp(), dateShiftFixedBy: claims.uid }

  /** Applique le décalage à un document (+ recalcul anniversaire si birthDate présent). */
  function fixDocData(data: Record<string, unknown>): { updates: Record<string, unknown>; changed: boolean } {
    const { value, changed } = shiftDates(data, null, false)
    const shifted = value as Record<string, unknown>
    const updates: Record<string, unknown> = {}
    // On ne réécrit que les champs réellement modifiés (diff superficiel suffisant :
    // shiftDates recrée les branches modifiées, on repère par référence).
    for (const [k, v] of Object.entries(shifted)) {
      if (v !== (data as Record<string, unknown>)[k]) updates[k] = v
    }
    // birthDate décalée → champs anniversaire recalculés.
    if ('birthDate' in updates) {
      const bf = birthdayFields(updates.birthDate)
      if (bf) Object.assign(updates, bf)
    }
    return { updates, changed }
  }

  /** Corrige une collection de docs marqués + leurs sous-collections. */
  async function fixCollection(
    collName: string,
    subcollections: string[],
  ): Promise<CollectionReport> {
    const report: CollectionReport = { scanned: 0, fixed: 0, alreadyFixed: 0 }
    let query = db.collection(collName).where('isMigrated', '==', true)
    if (sourceFile) query = query.where('migrationSource', '==', sourceFile)
    const snap = await query.get()

    for (const docSnap of snap.docs) {
      report.scanned++
      const data = docSnap.data() as Record<string, unknown>
      if (data.dateShiftFixedAt) {
        report.alreadyFixed++
        continue
      }

      const batch = db.batch()
      let familyChanged = false

      const { updates, changed } = fixDocData(data)
      if (changed && Object.keys(updates).length > 0) familyChanged = true
      if (!dryRun) batch.set(docSnap.ref, { ...updates, ...stamp }, { merge: true })

      // Sous-collections (payments / supports / earlyRefunds / refunds).
      for (const sub of subcollections) {
        const subSnap = await docSnap.ref.collection(sub).get()
        for (const subDoc of subSnap.docs) {
          const subData = subDoc.data() as Record<string, unknown>
          if (subData.dateShiftFixedAt) continue
          const r = fixDocData(subData)
          if (r.changed) familyChanged = true
          if (!dryRun) batch.set(subDoc.ref, { ...r.updates, ...stamp }, { merge: true })
        }
      }

      if (familyChanged) report.fixed++
      if (!dryRun) await batch.commit()
    }
    return report
  }

  try {
    const [ci, cs, users] = await Promise.all([
      fixCollection(CONTRACTS_CI, ['payments', 'supports', 'earlyRefunds']),
      fixCollection(CAISSE_CONTRACTS, ['payments', 'refunds']),
      fixCollection(USERS, []),
    ])

    return NextResponse.json({
      dryRun,
      sourceFile: sourceFile ?? 'tous les imports',
      caisseImprevue: ci,
      caisseSpeciale: cs,
      membres: users,
      message: dryRun
        ? 'Simulation : aucune donnée modifiée.'
        : 'Correction appliquée (+1 jour) aux dates des documents importés.',
    })
  } catch (error) {
    console.error('[fix-dates] échec:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la correction' },
      { status: 500 },
    )
  }
}
