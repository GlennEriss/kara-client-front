/**
 * Squelette de chargement pour la vue détails d'une demande d'adhésion
 * Conserve le design existant du composant original
 */

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DetailsSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3 lg:space-x-4">
          <Skeleton className="h-10 lg:h-10 w-16 lg:w-20" />
          <div className="space-y-2">
            <Skeleton className="h-6 lg:h-8 w-64 lg:w-96" />
            <Skeleton className="h-3 lg:h-4 w-48 lg:w-64" />
          </div>
        </div>
        <Skeleton className="h-8 w-32 rounded-full self-start lg:self-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-5 lg:h-6 w-40 lg:w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <Skeleton className="h-3 lg:h-4 w-20 lg:w-24" />
                      <Skeleton className="h-5 lg:h-6 w-28 lg:w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6 lg:space-y-8">
          <Card className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-5 lg:h-6 w-28 lg:w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 lg:h-64 w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-5 lg:h-6 w-32 lg:w-40" />
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20 lg:w-24" />
                  <Skeleton className="h-4 lg:h-5 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
