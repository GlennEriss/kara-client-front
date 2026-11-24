import type { CollectionReference, DocumentData } from 'firebase-admin/firestore'
import { ogarTariffSha256 } from './ogar-tariff'

export const collection = 'insurance-reference-documents'
export const legacyId = 'ogar-vehicules'
export const vehicleType = { id: 'vehicules', label: 'Véhicules' }
const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hashPattern = /^[a-f0-9]{64}$/

export function archiveKey(name: string) {
  return name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 110).replace(/\.pdf$/i, '') + '.pdf'
}

export function documentFor(id: string, data: DocumentData | undefined) {
  if (!data) return null
  const insurerId = id === legacyId ? 'ogar' : data.insurerId
  if (typeof insurerId !== 'string' || insurerId.length > 60 || !keyPattern.test(insurerId)) return null
  const hasAssetType = id !== legacyId && data.assetTypeId !== undefined
  const assetTypeId = hasAssetType ? data.assetTypeId : vehicleType.id
  const assetType = hasAssetType ? data.assetType : vehicleType.label
  if (typeof assetTypeId !== 'string' || assetTypeId.length > 60 || !keyPattern.test(assetTypeId) ||
    typeof assetType !== 'string' || archiveKey(assetType) !== assetTypeId) return null

  const prefix = hasAssetType ? `${insurerId}--${assetTypeId}` : insurerId
  const insurerPath = hasAssetType ? `${insurerId}/${assetTypeId}` : insurerId
  const path = id === legacyId
    ? `${collection}/${legacyId}.pdf`
    : `${collection}/${insurerPath}/${data.sha256}.pdf`
  if (data.storagePath !== path || (id !== legacyId &&
    (typeof data.sha256 !== 'string' || !hashPattern.test(data.sha256) || id !== `${prefix}--${data.sha256}`))) return null

  return {
    id,
    insurerId,
    insurer: typeof data.insurer === 'string' ? data.insurer : insurerId.toUpperCase(),
    assetTypeId,
    assetType,
    filename: safeFilename(typeof data.filename === 'string' ? data.filename : 'bareme.pdf'),
    importedAt: data.importedAt?.toDate?.()?.toISOString() ?? null,
    storagePath: path,
    sha256: typeof data.sha256 === 'string' && hashPattern.test(data.sha256) ? data.sha256 : null,
  }
}

export async function listTariffDocuments(documents: CollectionReference) {
  const snapshot = await documents.orderBy('importedAt', 'desc').get()
  return snapshot.docs.flatMap(snap => {
    const document = documentFor(snap.id, snap.data())
    return document ? [document] : []
  })
}

export function verifiedOgarDocument(documents: NonNullable<ReturnType<typeof documentFor>>[]) {
  const current = documents.find(item => item.insurerId === 'ogar' && item.assetTypeId === vehicleType.id)
  return current?.sha256 === ogarTariffSha256 ? current : null
}
