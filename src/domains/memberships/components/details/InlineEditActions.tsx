'use client'

import { Button } from '@/components/ui/button'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin'

interface InlineEditActionsProps {
  editing: boolean
  saving: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}

/**
 * Boutons d'édition inline pour l'en-tête d'une carte de fiche membre.
 * Réservé au superAdmin : rien n'est rendu pour les autres rôles (lecture seule).
 */
export function InlineEditActions({ editing, saving, onEdit, onSave, onCancel }: InlineEditActionsProps) {
  const isSuperAdmin = useIsSuperAdmin()
  if (!isSuperAdmin) return null

  if (!editing) {
    return (
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-gray-500" onClick={onEdit}>
        <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
      </Button>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        className="h-7 bg-[#234D65] px-2 text-xs text-white hover:bg-[#1A3D4F]"
        onClick={onSave}
        disabled={saving}
      >
        {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
        Enregistrer
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onCancel} disabled={saving}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
