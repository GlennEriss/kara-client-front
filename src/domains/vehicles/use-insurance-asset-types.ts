'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { extraAssetTypes, insuranceAssetSettingsId, newInsuranceAssetType } from './asset-types'

const queryKey = ['insurance-asset-types']
const settings = () => doc(db, 'settings', insuranceAssetSettingsId)

export function useInsuranceAssetTypes() {
  return useQuery({
    queryKey,
    queryFn: async () => extraAssetTypes((await getDoc(settings())).data()?.values),
  })
}

export function useAddInsuranceAssetType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (label: string) => runTransaction(db, async (transaction) => {
      const ref = settings()
      const current = extraAssetTypes((await transaction.get(ref)).data()?.values)
      const values = [...current, newInsuranceAssetType(label, current)]
      transaction.set(ref, { values })
      return values
    }),
    onSuccess: (values) => queryClient.setQueryData(queryKey, values),
  })
}
