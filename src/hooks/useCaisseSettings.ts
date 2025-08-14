"use client"

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { activateSettings, createSettings, getActiveSettings, listSettings, updateSettings, deleteSettings } from '@/db/caisse/settings.db'
import type { CaisseType } from '@/services/caisse/types'

export function useCaisseSettingsList() {
  return useQuery({ queryKey: ['caisse-settings'], queryFn: listSettings })
}

export function useActiveCaisseSettings() {
  return useQuery({ queryKey: ['caisse-settings-active'], queryFn: () => getActiveSettings() as any })
}

export function useActiveCaisseSettingsByType(type?: CaisseType) {
  return useQuery({ queryKey: ['caisse-settings-active', type || 'ANY'], queryFn: () => getActiveSettings(type) as any })
}

export function useCaisseSettingsMutations() {
  const qc = useQueryClient()
  return {
    create: useMutation({
      mutationFn: createSettings,
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['caisse-settings'] }) }
    }),
    update: useMutation({
      mutationFn: ({ id, updates }: { id: string; updates: any }) => updateSettings(id, updates),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['caisse-settings'] }) }
    }),
    activate: useMutation({
      mutationFn: (id: string) => activateSettings(id),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['caisse-settings'] }); qc.invalidateQueries({ queryKey: ['caisse-settings-active'] }) }
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteSettings(id),
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['caisse-settings'] }); qc.invalidateQueries({ queryKey: ['caisse-settings-active'] }) }
    })
  }
}

