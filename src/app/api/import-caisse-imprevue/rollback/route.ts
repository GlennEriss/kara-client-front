import { verifyAdminSessionFromRequest } from '@/domains/auth/server/session'
import { adminFirestore } from '@/firebase/adminFirestore'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type Payload = {
  sourceFile: string
  sheetName: string
}

const CONTRACTS = 'contractsCI'
const USERS = 'users'
const SUBSCRIPTIONS = 'subscriptions'

/**
 * Supprime tout ce qu'un import a créé, ciblé par `migrationSource` (nom du
 * fichier) + `migrationSheet` (feuille) :
 *  - contrats contractsCI (+ sous-collections payments / supports / earlyRefunds)
 *  - membres users migrés
 *  - adhésions subscriptions migrées
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
    const { sourceFile, sheetName } = (await req.json()) as Partial<Payload>
    if (!sourceFile || !sheetName) {
      return NextResponse.json({ error: 'sourceFile et sheetName requis' }, { status: 400 })
    }

    let contractsDeleted = 0
    let usersDeleted = 0
    let subscriptionsDeleted = 0

    // 1) Contrats + sous-collections
    const contractsSnap = await adminFirestore
      .collection(CONTRACTS)
      .where('migrationSource', '==', sourceFile)
      .get()
    for (const contractDoc of contractsSnap.docs) {
      if ((contractDoc.data() as { migrationSheet?: string }).migrationSheet !== sheetName) continue
      for (const sub of ['payments', 'supports', 'earlyRefunds']) {
        const subSnap = await contractDoc.ref.collection(sub).get()
        for (const d of subSnap.docs) await d.ref.delete()
      }
      await contractDoc.ref.delete()
      contractsDeleted++
    }

    // 2) Adhésions (subscriptions) migrées
    const subsSnap = await adminFirestore
      .collection(SUBSCRIPTIONS)
      .where('migrationSource', '==', sourceFile)
      .get()
    for (const subDoc of subsSnap.docs) {
      if ((subDoc.data() as { migrationSheet?: string }).migrationSheet !== sheetName) continue
      await subDoc.ref.delete()
      subscriptionsDeleted++
    }

    // 3) Membres migrés
    const usersSnap = await adminFirestore
      .collection(USERS)
      .where('migrationSource', '==', sourceFile)
      .get()
    for (const userDoc of usersSnap.docs) {
      if ((userDoc.data() as { migrationSheet?: string }).migrationSheet !== sheetName) continue
      await userDoc.ref.delete()
      usersDeleted++
    }

    return NextResponse.json({ contractsDeleted, usersDeleted, subscriptionsDeleted })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue'
    return NextResponse.json({ error: 'Erreur suppression import', details: message }, { status: 500 })
  }
}
