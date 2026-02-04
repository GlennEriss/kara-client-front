/**
 * Bannière d’alerte lorsqu’il existe des groupes de doublons non résolus
 * Voir documentation/membership-requests/doublons/wireframes/WIREFRAME_ALERTE_ET_ONGLET_DOUBLONS.md
 */

'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { useDuplicateAlert } from '../../hooks/useDuplicateAlert'
import { cn } from '@/lib/utils'

export interface DuplicatesAlertProps {
  onViewDuplicates?: () => void
  className?: string
}

export function DuplicatesAlert({ onViewDuplicates, className }: DuplicatesAlertProps) {
  const { hasDuplicates, isLoading } = useDuplicateAlert()

  if (isLoading || !hasDuplicates) return null

  return (
    <Alert
      role="alert"
      data-testid="duplicates-alert"
      className={cn(
        'border-kara-warning/50 bg-kara-warning/10 text-kara-warning [&>svg]:text-kara-warning',
        className
      )}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">Dossiers en doublon détectés</AlertTitle>
      <AlertDescription className="mt-1">
        Des dossiers partagent le même numéro de téléphone, adresse email ou numéro de pièce
        d&apos;identité.
        {onViewDuplicates && (
          <button
            type="button"
            onClick={onViewDuplicates}
            className="ml-2 font-medium underline underline-offset-2 hover:no-underline focus:outline-none"
            data-testid="duplicates-alert-link"
          >
            Voir les doublons
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}
