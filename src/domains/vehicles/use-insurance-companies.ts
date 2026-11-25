'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { insurerKey, insurerSettingsId, readInsurerNames } from './insurance-companies'

const queryKey = ['insurance-companies']

export function useInsuranceCompanies(enabled = true) {
  return useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const settings = await getDoc(doc(db, 'settings', insurerSettingsId))
      return readInsurerNames(settings.data())
    },
  })
}

export function useUpdateInsuranceCompanies() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (change: { add: string } | { remove: string }) => runTransaction(db, async transaction => {
      const ref = doc(db, 'settings', insurerSettingsId)
      const names = readInsurerNames((await transaction.get(ref)).data())
      let next = names.filter(name => !('remove' in change) || insurerKey(name) !== insurerKey(change.remove))
      if ('add' in change) {
        const name = change.add.trim().replace(/\s+/g, ' ')
        const key = insurerKey(name)
        if (name.length < 2 || name.length > 60 || !key) throw Error('Saisissez un nom de 2 à 60 caractères.')
        if (names.some(existing => insurerKey(existing) === key)) throw Error('Cet assureur figure déjà dans la liste.')
        if (names.length >= 100) throw Error('La liste des assureurs est pleine.')
        next = readInsurerNames({ names: [...names, name] })
      }
      transaction.set(ref, { names: next })
      return next
    }),
    onSuccess: (names) => client.setQueryData(queryKey, names),
  })
}
