import type { Firestore } from 'firebase-admin/firestore'
import { extraAssetTypes, insuranceAssetSettingsId, isCustomAssetType } from './asset-types'

export async function readInsuranceAssetTypes(db: Firestore) {
  return extraAssetTypes((await db.collection('settings').doc(insuranceAssetSettingsId).get()).data()?.values)
}

export async function ensureConfiguredAssetType(db: Firestore, value: string, previous?: string) {
  if (isCustomAssetType(value) && value !== previous && !(await readInsuranceAssetTypes(db)).includes(value)) {
    throw new Error('Ce type de bien n’est pas dans la liste.')
  }
}
