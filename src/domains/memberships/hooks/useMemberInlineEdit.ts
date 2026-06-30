'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { updateUser } from '@/db/user.db'
import type { User } from '@/types/types'

/**
 * Édition inline d'une carte de la fiche membre (réservé admin).
 * Fournit l'état d'édition + une sauvegarde qui écrit sur le document membre
 * et rafraîchit la fiche.
 */
export function useMemberInlineEdit(memberId: string) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async (updates: Partial<User>): Promise<boolean> => {
    setSaving(true)
    try {
      const ok = await updateUser(memberId, updates)
      if (!ok) throw new Error('save failed')
      await queryClient.invalidateQueries({ queryKey: ['membership-details', 'member', memberId] })
      toast.success('Modifications enregistrées')
      setEditing(false)
      return true
    } catch {
      toast.error("Échec de l'enregistrement")
      return false
    } finally {
      setSaving(false)
    }
  }

  return { editing, setEditing, saving, save }
}
