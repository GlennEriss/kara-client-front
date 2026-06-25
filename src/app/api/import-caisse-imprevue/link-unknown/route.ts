import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import {
  UNKNOWN_USER_ID,
  UNKNOWN_USER_MATRICULE,
  UNKNOWN_USER_LAST_NAME,
  UNKNOWN_USER_FIRST_NAME,
  buildUnknownUserBase,
} from '@/domains/financial/caisse-imprevue/import/unknownUser'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const USERS = 'users'
const CONTRACTS = 'contractsCI'

/**
 * Rattache rétroactivement les membres / contrats sans parrain ou sans contact
 * d'urgence au compte placeholder « INCONNU INCONNU ».
 *  - users.intermediaryCode vide → INCONNU
 *  - contractsCI.emergencyContact manquant / vide → INCONNU INCONNU
 * Le compte INCONNU est créé s'il n'existe pas. Opération idempotente.
 */
export async function POST(req: NextRequest) {
  if (!adminFirestore) {
    return NextResponse.json({ error: 'Firebase Admin Firestore non configure' }, { status: 503 })
  }

  const claims = await verifyAdminSessionFromRequest(req)
  if (!claims) {
    return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 })
  }

  try {
    const now = new Date()

    // 1) Compte INCONNU INCONNU (créé si absent).
    const unknownRef = adminFirestore.collection(USERS).doc(UNKNOWN_USER_ID)
    const unknownSnap = await unknownRef.get()
    let unknownCreated = false
    if (!unknownSnap.exists) {
      await unknownRef.set({ ...buildUnknownUserBase(), createdAt: now, updatedAt: now })
      unknownCreated = true
    }

    // 2) Membres sans parrain → intermediaryCode = INCONNU.
    let membersLinked = 0
    const usersSnap = await adminFirestore.collection(USERS).get()
    {
      let batch = adminFirestore.batch()
      let ops = 0
      for (const d of usersSnap.docs) {
        if (d.id === UNKNOWN_USER_ID) continue
        const code = (d.data() as { intermediaryCode?: string }).intermediaryCode
        if (code && String(code).trim()) continue // déjà un parrain
        batch.update(d.ref, { intermediaryCode: UNKNOWN_USER_MATRICULE, updatedAt: now })
        membersLinked++
        ops++
        if (ops >= 400) {
          await batch.commit()
          batch = adminFirestore.batch()
          ops = 0
        }
      }
      if (ops > 0) await batch.commit()
    }

    // 3) Contrats CI sans contact d'urgence → INCONNU INCONNU.
    let contractsLinked = 0
    const contractsSnap = await adminFirestore.collection(CONTRACTS).get()
    {
      let batch = adminFirestore.batch()
      let ops = 0
      for (const d of contractsSnap.docs) {
        const ec = (d.data() as { emergencyContact?: { lastName?: string } }).emergencyContact
        const hasContact = ec && ec.lastName && ec.lastName.trim() && ec.lastName.trim().toUpperCase() !== 'INCONNU'
        if (hasContact) continue
        batch.update(d.ref, {
          emergencyContact: {
            memberId: UNKNOWN_USER_ID,
            lastName: UNKNOWN_USER_LAST_NAME,
            firstName: UNKNOWN_USER_FIRST_NAME,
            phone1: '',
            phone2: '',
            relationship: 'INCONNU',
            idNumber: 'MIGRATION',
            typeId: 'MIGRATION',
            documentPhotoUrl: '',
          },
          updatedAt: now,
        })
        contractsLinked++
        ops++
        if (ops >= 400) {
          await batch.commit()
          batch = adminFirestore.batch()
          ops = 0
        }
      }
      if (ops > 0) await batch.commit()
    }

    return NextResponse.json({ unknownCreated, membersLinked, contractsLinked })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue'
    return NextResponse.json({ error: 'Erreur rattachement INCONNU', details: message }, { status: 500 })
  }
}
