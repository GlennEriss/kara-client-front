import { getStorage } from 'firebase-admin/storage'
import { NextResponse, type NextRequest } from 'next/server'
import { createVehicleRewardsRepository } from '@/db/vehicle-rewards.db'
import { createServerFirestorePort } from '@/domains/finance/server/firestore-port'
import { mobileCapabilities, mobileJson, requireMobileCaller } from '@/domains/mobile/server/access'
import { insuranceAssetOptions } from '@/domains/vehicles/asset-types'
import { readInsuranceAssetTypes } from '@/domains/vehicles/asset-types-server'
import {
  collection, listTariffDocuments, ogarSimulation, verifiedOgarDocument,
} from '@/domains/vehicles/server/tariff-archive'
import { adminApp } from '@/firebase/admin'
import { adminFirestore } from '@/firebase/adminFirestore'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const caller = await requireMobileCaller(request)
  if (caller instanceof NextResponse) return caller
  if (caller.mustChangePassword || !mobileCapabilities(caller.access).sections.vehicles) {
    return mobileJson({ error: 'Vos accès ne permettent pas d’ouvrir le simulateur.' }, 403)
  }
  if (!adminFirestore) return mobileJson({ error: 'Simulateur indisponible.' }, 503)

  try {
    const db = adminFirestore
    const readOgar = async () => verifiedOgarDocument(await listTariffDocuments(db.collection(collection)))
    const id = request.nextUrl.searchParams.get('document')
    if (id !== null) {
      const document = await readOgar()
      if (!document || document.id !== id) return mobileJson({ error: 'Barème OGAR introuvable.' }, 404)
      const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      if (!adminApp || !bucket) throw new Error('Stockage indisponible.')
      const [bytes] = await getStorage(adminApp).bucket(bucket).file(document.storagePath).download()
      return mobileJson({ base64: bytes.toString('base64'), mime: 'application/pdf', filename: document.filename })
    }

    const rewards = createVehicleRewardsRepository(createServerFirestorePort(db))
    const [catalog, partners, ogar] = await Promise.all([
      readInsuranceAssetTypes(db),
      rewards.listInsurancePartners(),
      readOgar(),
    ])
    return mobileJson({
      assetTypes: insuranceAssetOptions(catalog),
      partners: partners.map(({ id, name, commissionRate, memberSharePercent }) =>
        ({ id, name, commissionRate, memberSharePercent })),
      ogar: ogarSimulation(ogar),
    })
  } catch {
    return mobileJson({ error: 'Impossible de charger les données du simulateur. Réessayez.' }, 503)
  }
}
