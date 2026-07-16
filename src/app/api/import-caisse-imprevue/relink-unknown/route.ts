import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const USERS = 'users'
const CONTRACTS = 'contractsCI'

/**
 * Re-pointe les références « INCONNU » vers un AUTRE compte placeholder.
 *
 * Cas d'usage : le rattachement rétroactif (`link-unknown`) a lié les membres
 * sans parrain et les contrats sans contact d'urgence au mauvais compte
 * INCONNU. On corrige en repointant tout ce qui vaut `fromId` vers le membre
 * `toMatricule` (dont le doc id == matricule).
 *
 *  - users.intermediaryCode == fromId  → toMatricule
 *  - contractsCI.emergencyContact.memberId == fromId → compte cible (id + nom)
 *
 * Idempotent (une 2e passe ne trouve plus rien) et `dryRun` pour compter d'abord.
 */
export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configuré' }, { status: 503 })
  }
  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
  }

  const db = adminFirestore
  const body = (await req.json().catch(() => ({}))) as {
    toMatricule?: string
    fromId?: string
    dryRun?: boolean
  }
  const toMatricule = (body.toMatricule || '').trim()
  const fromId = (body.fromId || 'INCONNU').trim()
  const dryRun = body.dryRun !== false // simulation par défaut

  if (!toMatricule) {
    return NextResponse.json({ error: 'Matricule cible requis' }, { status: 400 })
  }

  try {
    // 1) Compte cible : doc id == matricule, sinon recherche par champ matricule.
    let targetSnap = await db.collection(USERS).doc(toMatricule).get()
    if (!targetSnap.exists) {
      const q = await db.collection(USERS).where('matricule', '==', toMatricule).limit(1).get()
      if (!q.empty) targetSnap = q.docs[0]
    }
    if (!targetSnap.exists) {
      return NextResponse.json(
        { error: `Aucun membre trouvé pour le matricule ${toMatricule}` },
        { status: 404 },
      )
    }
    const target = targetSnap.data() as { firstName?: string; lastName?: string; matricule?: string }
    const targetId = targetSnap.id
    const targetMatricule = target.matricule || toMatricule
    const now = new Date()

    // 2) Membres : intermediaryCode == fromId → matricule cible.
    let membersRelinked = 0
    const usersSnap = await db.collection(USERS).get()
    {
      let batch = db.batch()
      let ops = 0
      for (const d of usersSnap.docs) {
        if (d.id === targetId) continue
        const code = String((d.data() as { intermediaryCode?: string }).intermediaryCode || '').trim()
        if (code !== fromId) continue
        membersRelinked++
        if (!dryRun) {
          batch.update(d.ref, { intermediaryCode: targetMatricule, updatedAt: now })
          if (++ops >= 400) {
            await batch.commit()
            batch = db.batch()
            ops = 0
          }
        }
      }
      if (!dryRun && ops > 0) await batch.commit()
    }

    // 3) Contrats CI : emergencyContact.memberId == fromId → compte cible.
    let contractsRelinked = 0
    const contractsSnap = await db.collection(CONTRACTS).get()
    {
      let batch = db.batch()
      let ops = 0
      for (const d of contractsSnap.docs) {
        const ec = (d.data() as { emergencyContact?: { memberId?: string } }).emergencyContact
        if (!ec || String(ec.memberId || '').trim() !== fromId) continue
        contractsRelinked++
        if (!dryRun) {
          batch.update(d.ref, {
            'emergencyContact.memberId': targetId,
            'emergencyContact.lastName': target.lastName || 'INCONNU',
            'emergencyContact.firstName': target.firstName || 'INCONNU',
            updatedAt: now,
          })
          if (++ops >= 400) {
            await batch.commit()
            batch = db.batch()
            ops = 0
          }
        }
      }
      if (!dryRun && ops > 0) await batch.commit()
    }

    // 4) Suppression de l'ancien compte placeholder (`fromId`) une fois les
    //    références repointées. On ne supprime jamais le compte cible.
    let oldAccountDeleted = false
    if (fromId !== targetId) {
      for (const col of ['users', 'admins']) {
        const ref = db.collection(col).doc(fromId)
        const snap = await ref.get()
        if (snap.exists) {
          if (!dryRun) await ref.delete()
          oldAccountDeleted = true
        }
      }
    }

    return NextResponse.json({
      dryRun,
      fromId,
      toMatricule: targetMatricule,
      targetId,
      targetName: `${target.firstName || ''} ${target.lastName || ''}`.trim() || targetMatricule,
      membersRelinked,
      contractsRelinked,
      oldAccountDeleted,
      message: dryRun
        ? 'Simulation : aucune donnée modifiée.'
        : `Références « ${fromId} » repointées vers ${targetMatricule}${oldAccountDeleted ? ` et ancien compte « ${fromId} » supprimé` : ''}.`,
    })
  } catch (error) {
    console.error('[relink-unknown] échec:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors du re-pointage' },
      { status: 500 },
    )
  }
}
