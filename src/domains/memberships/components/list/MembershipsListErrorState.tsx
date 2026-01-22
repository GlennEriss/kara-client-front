'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { ModernStatsCard } from './MembershipsListStats'

interface MembershipsListErrorStateProps {
  onRetry: () => void
}

export function MembershipsListErrorState({ onRetry }: MembershipsListErrorStateProps) {
  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Stats même en cas d'erreur */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ModernStatsCard
          title="Total"
          value={0}
          subtitle="Erreur de chargement"
          percentage={0}
          color="#ef4444"
          icon={AlertCircle}
        />
      </div>

      <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-700 font-medium">
          Une erreur est survenue lors du chargement des membres.
          <Button
            variant="link"
            className="p-0 h-auto ml-2 text-red-700 underline font-bold hover:text-red-800"
            onClick={onRetry}
          >
            Réessayer maintenant
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
