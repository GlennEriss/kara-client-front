'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { insuranceAssetOptions, insuranceAssetSettingsId, newInsuranceAssetType, parseInsuranceAssetCatalog } from './asset-types'

const queryKey = ['insurance-asset-types']
const settings = () => doc(db, 'settings', insuranceAssetSettingsId)

export function useInsuranceAssetTypes() {
  return useQuery({
    queryKey,
    queryFn: async () => parseInsuranceAssetCatalog((await getDoc(settings())).data()),
  })
}

export function useUpdateInsuranceAssetTypes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: { label: string } | { value: string; active: boolean }) => runTransaction(db, async (transaction) => {
      const ref = settings()
      const catalog = parseInsuranceAssetCatalog((await transaction.get(ref)).data())
      if ('label' in change) {
        catalog.values.push(newInsuranceAssetType(change.label, catalog.values))
      } else {
        if (change.value === 'other' || !insuranceAssetOptions(catalog, { includeInactive: true }).some((option) => option.value === change.value)) {
          throw new Error('Ce type de bien ne peut pas être modifié.')
        }
        const inactive = new Set(catalog.inactive)
        if (change.active) inactive.delete(change.value)
        else inactive.add(change.value)
        catalog.inactive = [...inactive]
      }
      transaction.set(ref, catalog)
      return catalog
    }),
    onSuccess: (catalog) => queryClient.setQueryData(queryKey, catalog),
  })
}
