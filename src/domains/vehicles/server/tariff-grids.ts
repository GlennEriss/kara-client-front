import { FieldValue, type DocumentData, type Firestore } from 'firebase-admin/firestore'
import { tariffGridSchema, type TariffGrid, type TariffGridInput } from '../tariff-grid'
import { archiveKey } from './tariff-archive'
import { ogarTariffGroups, ogarTariffTitle } from './ogar-tariff'

const collection = 'insurance-tariff-grids'
export const ogarGridId = 'ogar--vehicules'
const initialOgar: TariffGrid = {
  id: ogarGridId,
  insurer: 'OGAR',
  assetType: 'Véhicules',
  revision: 0,
  updatedAt: null,
  groups: ogarTariffGroups.map(group => ({
    ...group,
    assetTypes: [...group.assetTypes],
    plans: [...group.plans],
    bands: group.bands.map(band => ({ label: band.label, rates: [...band.rates] })),
  })),
}

export function tariffGridId(insurer: string, assetType: string) {
  const keys = [archiveKey(insurer), archiveKey(assetType)]
  return keys.every(Boolean) ? keys.join('--') : null
}

function storedGrid(id: string, data: DocumentData | undefined): TariffGrid {
  const { revision, ...values } = tariffGridSchema.parse(data)
  if (!revision || tariffGridId(values.insurer, values.assetType) !== id) {
    throw Error('Grille tarifaire invalide.')
  }
  return { id, ...values, revision, updatedAt: data?.updatedAt?.toDate()?.toISOString() ?? null }
}

export async function listTariffGrids(db: Firestore) {
  const snapshot = await db.collection(collection).get()
  const items = snapshot.docs.map(doc => storedGrid(doc.id, doc.data()))
  if (!items.some(item => item.id === ogarGridId)) items.push(initialOgar)
  return items.sort((a, b) => a.insurer.localeCompare(b.insurer, 'fr') || a.assetType.localeCompare(b.assetType, 'fr'))
}

export async function loadOgarGrid(db: Firestore) {
  const doc = await db.collection(collection).doc(ogarGridId).get()
  return doc.exists ? storedGrid(doc.id, doc.data()) : initialOgar
}

export function ogarGridSimulation(grid: TariffGrid) {
  return {
    gridId: grid.id,
    documentId: grid.revision === 0 ? 'ogar-vehicules' : grid.id,
    title: grid.revision === 0 ? ogarTariffTitle : 'Grille OGAR · Véhicules',
    groups: grid.groups,
  }
}

export async function saveTariffGrid(db: Firestore, id: string, input: TariffGridInput, uid: string) {
  const ref = db.collection(collection).doc(id)
  return db.runTransaction(async transaction => {
    const current = await transaction.get(ref)
    const revision = current.exists ? storedGrid(id, current.data()).revision : id === ogarGridId ? 0 : null
    if (input.revision !== revision) return false
    transaction.set(ref, {
      ...input,
      revision: (revision ?? 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    })
    return true
  })
}

export function hasValidOgarCoverage(grid: TariffGridInput) {
  return grid.groups.every(group => group.assetTypes.length > 0 &&
    group.assetTypes.every(type => ['car', 'van', 'motorcycle', 'bus', 'truck', 'machinery'].includes(type)))
}
