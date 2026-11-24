import type { Firestore } from 'firebase-admin/firestore'
import { insuranceAssetSettingsId, isAvailableInsuranceAssetType, parseInsuranceAssetCatalog } from './asset-types'

export async function readInsuranceAssetTypes(db: Firestore) {
  return parseInsuranceAssetCatalog((await db.collection('settings').doc(insuranceAssetSettingsId).get()).data())
}

export async function ensureConfiguredAssetType(db: Firestore, value: string, previous?: string) {
  if (value !== 'other' && value !== previous && !isAvailableInsuranceAssetType(value, await readInsuranceAssetTypes(db))) {
    throw new Error('Ce type de bien n’est plus disponible.')
  }
}
