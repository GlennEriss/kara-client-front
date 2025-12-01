'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { AlertCircle, Car, Filter, Search } from 'lucide-react'
import { useAllMembers } from '@/hooks/useMembers'
import { useUpdateMemberHasCar } from '@/hooks/useMembers'
import { MemberWithSubscription } from '@/db/member.db'
import { UserFilters } from '@/types/types'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import MembershipPagination from './MembershipPagination'

type VehicleFilter = 'all' | 'with' | 'without'

export default function MemberVehicleList() {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Construire les filtres selon le filtre véhicule sélectionné + recherche nom/matricule
  const filters: UserFilters = {
    ...(vehicleFilter === 'all' ? {} : { hasCar: vehicleFilter === 'with' }),
    ...(searchQuery.trim()
      ? {
          searchQuery: searchQuery.trim(),
        }
      : {}),
  }

  const { 
    data: membersData, 
    isLoading, 
    error, 
    refetch 
  } = useAllMembers(filters, currentPage, itemsPerPage)

  // Réinitialiser la page quand le filtre change
  useEffect(() => {
    setCurrentPage(1)
  }, [vehicleFilter, searchQuery])

  const updateHasCarMutation = useUpdateMemberHasCar()

  const membersWithSubscriptions: MemberWithSubscription[] = membersData?.data || []

  const handleToggleHasCar = async (memberId: string, currentHasCar: boolean) => {
    if (!user?.uid) {
      toast.error('Erreur', {
        description: 'Vous devez être connecté pour effectuer cette action',
        duration: 3000
      })
      return
    }

    const newHasCar = !currentHasCar

    try {
      await updateHasCarMutation.mutateAsync({
        memberId,
        hasCar: newHasCar,
        updatedBy: user.uid
      })

      toast.success(
        newHasCar ? '✅ Véhicule ajouté' : '✅ Véhicule retiré',
        {
          description: `Le statut véhicule a été mis à jour avec succès`,
          duration: 3000
        }
      )

      // Rafraîchir les données
      refetch()
    } catch (error: any) {
      toast.error('❌ Erreur lors de la mise à jour', {
        description: error?.message || 'Impossible de mettre à jour le statut véhicule',
        duration: 4000
      })
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des membres.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Car className="h-6 w-6 text-[#234D65]" />
            Gestion des véhicules des membres
          </h2>
          <p className="text-gray-600 mt-1">
            {membersData && (
              <span>
                {membersData.pagination.totalItems.toLocaleString()} membre(s) {vehicleFilter !== 'all' && (
                  vehicleFilter === 'with' ? 'avec véhicule' : 'sans véhicule'
                )}
              </span>
            )}
          </p>
        </div>

        {/* Filtres véhicule + recherche */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Recherche par nom / matricule */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom, prénom ou matricule"
              className="pl-9 pr-3 h-9"
            />
          </div>

          {/* Filtre véhicule */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={vehicleFilter} onValueChange={(value: VehicleFilter) => setVehicleFilter(value)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filtrer par véhicule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                <SelectItem value="with">Avec véhicule</SelectItem>
                <SelectItem value="without">Sans véhicule</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Liste des membres */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : membersWithSubscriptions.length > 0 ? (
        <div className="space-y-3">
          {membersWithSubscriptions.map((member) => (
            <Card 
              key={member.id} 
              className="hover:shadow-md transition-shadow duration-200 border border-gray-200"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Informations du membre */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {member.firstName} {member.lastName}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        Matricule: {member.matricule}
                      </p>
                    </div>
                  </div>

                  {/* Switch */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-sm font-medium ${
                      member.hasCar ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {member.hasCar ? 'Avec véhicule' : 'Sans véhicule'}
                    </span>
                    <Switch
                      checked={member.hasCar || false}
                      onCheckedChange={() => handleToggleHasCar(member.id!, member.hasCar || false)}
                      disabled={updateHasCarMutation.isPending}
                      aria-label={`${member.hasCar ? 'Retirer' : 'Ajouter'} le véhicule pour ${member.firstName} ${member.lastName}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {membersData && membersData.pagination.totalItems > itemsPerPage && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg mt-6">
              <CardContent className="p-4">
                <MembershipPagination
                  pagination={membersData.pagination}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-lg">
          <CardContent className="text-center p-12">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Car className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aucun membre trouvé
                </h3>
                <p className="text-gray-600">
                  Il n'y a pas encore de membres enregistrés dans le système.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

