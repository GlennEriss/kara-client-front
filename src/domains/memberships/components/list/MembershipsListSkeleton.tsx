'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type ViewMode = 'grid' | 'list'

interface MembershipsListSkeletonProps {
  viewMode: ViewMode
  itemsPerPage: number
}

export function MembershipsListSkeleton({ viewMode, itemsPerPage }: MembershipsListSkeletonProps) {
  // Vue liste : skeleton de tableau
  if (viewMode === 'list') {
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Photo</TableHead>
              <TableHead className="w-48">Nom complet</TableHead>
              <TableHead className="w-32">Matricule</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-40">Abonnement</TableHead>
              <TableHead className="w-48">Contact</TableHead>
              <TableHead className="w-48">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(itemsPerPage)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="w-10 h-10 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Vue grid : skeleton de cartes
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
