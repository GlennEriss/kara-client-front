/**
 * Bandeau pour afficher les corrections demandées V2
 * 
 * Affiche la note de correction avec un style d'alerte visible
 */

'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { AlertCircle, FileText } from 'lucide-react'

interface CorrectionBannerV2Props {
  reviewNote?: string
  className?: string
}

export function CorrectionBannerV2({ reviewNote, className }: CorrectionBannerV2Props) {
  if (!reviewNote) {
    return null
  }

  // Séparer les corrections (une par ligne)
  const corrections = reviewNote.split('\n').filter(line => line.trim().length > 0)

  return (
    <Alert
      className={cn(
        'bg-amber-50 border-amber-200 text-amber-900 rounded-lg transition-all duration-200 hover:shadow-md',
        className
      )}
      data-testid="correction-banner"
    >
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="mt-2">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm mb-2">Corrections demandées :</p>
            <ul className="space-y-1 list-disc list-inside">
              {corrections.map((correction, index) => (
                <li key={index} className="text-sm">
                  {correction.trim()}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
