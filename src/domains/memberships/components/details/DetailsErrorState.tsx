/**
 * État d'erreur pour la vue détails d'une demande d'adhésion
 * Affiche un message d'erreur avec boutons de navigation
 */

'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface DetailsErrorStateProps {
  error?: unknown
  onRetry?: () => void
}

export function DetailsErrorState({ error, onRetry }: DetailsErrorStateProps) {
  const router = useRouter()

  const errorMessage = error instanceof Error 
    ? error.message 
    : 'La demande d\'adhésion demandée n\'existe pas ou n\'est plus accessible.'

  return (
    <div className="container mx-auto p-4 lg:p-8" data-testid="details-error">
      <Card className="shadow-2xl border-0 bg-linear-to-br from-white to-red-50/30">
        <CardContent className="p-8 lg:p-16 text-center">
          <div className="p-3 lg:p-4 rounded-full bg-red-100 w-fit mx-auto mb-4 lg:mb-6">
            <AlertCircle className="w-8 h-8 lg:w-12 lg:h-12 text-red-600" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4 text-gray-900">Demande introuvable</h2>
          <p className="text-gray-600 mb-6 lg:mb-8 text-base lg:text-lg max-w-md mx-auto leading-relaxed" data-testid="details-error-message">
            {errorMessage}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button
                onClick={onRetry}
                className="bg-linear-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
                data-testid="details-error-retry-button"
              >
                Réessayer
              </Button>
            )}
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 h-11 lg:h-12 px-6 lg:px-8"
              data-testid="details-error-back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la liste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
