'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type ViewMode = 'grid' | 'list'

interface MembershipsListSkeletonProps {
  viewMode: ViewMode
  itemsPerPage: number
}

export function MembershipsListSkeleton({ viewMode, itemsPerPage }: MembershipsListSkeletonProps) {
  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-6'
      }
    >
      {[...Array(itemsPerPage)].map((_, i) => (
        <Card
          key={i}
          className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md"
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
                <Skeleton className="h-3 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
              <Skeleton className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
