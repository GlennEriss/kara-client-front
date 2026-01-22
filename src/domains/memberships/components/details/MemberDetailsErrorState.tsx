/**
 * État d'erreur pour la vue détails d'un membre
 * Affiche un message d'erreur avec boutons de navigation
 */

'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MemberDetailsErrorStateProps {
  error?: unknown
  onRetry?: () => void
}

export function MemberDetailsErrorState({ error, onRetry }: MemberDetailsErrorStateProps) {
  const router = useRouter()

  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Utilisateur introuvable'

  return (
    <div className="container mx-auto p-4 lg:p-8" data-testid="member-details-error">
      <Card className="shadow-2xl border-0">
        <CardContent className="p-8 text-center">
          <div className="p-3 lg:p-4 rounded-full bg-red-100 w-fit mx-auto mb-4 lg:mb-6">
            <AlertCircle className="w-8 h-8 lg:w-12 lg:h-12 text-red-600" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4 text-gray-900">Erreur de chargement</h2>
          <p className="text-gray-600 mb-6 lg:mb-8 text-base lg:text-lg max-w-md mx-auto leading-relaxed" data-testid="member-details-error-message">
            {errorMessage}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
                data-testid="member-details-error-retry-button"
              >
                Réessayer
              </Button>
            )}
            <Button
              onClick={() => router.back()}
              className="bg-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
              data-testid="member-details-error-back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
