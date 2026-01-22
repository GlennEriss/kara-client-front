/**
 * Squelette de chargement pour la vue détails d'un membre
 * Conserve le design existant du composant V1
 */

'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MemberDetailsSkeleton() {
  return (
    <div className="container mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
      {/* Header skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between bg-gradient-to-r from-white to-gray-50/50 p-4 lg:p-8 rounded-2xl shadow-lg border-0 space-y-4 lg:space-y-0">
        <div className="flex flex-col lg:flex-row lg:items-start space-y-3 lg:space-y-0 lg:space-x-6">
          <Skeleton className="h-10 lg:h-12 w-24 lg:w-32" />
          <div className="space-y-2">
            <Skeleton className="h-6 lg:h-8 w-48 lg:w-64" />
            <Skeleton className="h-4 lg:h-5 w-32 lg:w-40" />
          </div>
        </div>
        <Skeleton className="h-11 lg:h-12 w-40 lg:w-48" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Informations personnelles */}
          <Card className="group bg-gradient-to-br from-blue-50/30 to-blue-100/20 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 lg:h-6 w-48 lg:w-56" />
            </CardHeader>
            <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 lg:h-4 w-20 lg:w-24" />
                  <Skeleton className="h-5 lg:h-6 w-32 lg:w-40" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card className="group bg-gradient-to-br from-emerald-50/30 to-emerald-100/20 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 lg:h-6 w-32 lg:w-40" />
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 lg:h-4 w-24 lg:w-32" />
                  <Skeleton className="h-5 lg:h-6 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Profession */}
          <Card className="group bg-gradient-to-br from-amber-50/30 to-yellow-100/20 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 lg:h-6 w-32 lg:w-40" />
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 lg:h-4 w-24 lg:w-32" />
                  <Skeleton className="h-5 lg:h-6 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:space-y-8">
          {/* Photo */}
          <Card className="group bg-gradient-to-br from-indigo-50/30 to-indigo-100/20 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 lg:h-6 w-40 lg:w-48" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-48 lg:h-72 w-full rounded-xl" />
            </CardContent>
          </Card>

          {/* Adresse */}
          <Card className="group bg-gradient-to-br from-rose-50/30 to-pink-100/20 border-0 shadow-lg">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 lg:h-6 w-32 lg:w-40" />
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 lg:h-4 w-24 lg:w-32" />
                  <Skeleton className="h-5 lg:h-6 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
