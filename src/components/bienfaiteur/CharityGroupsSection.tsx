'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCharityParticipants } from '@/hooks/bienfaiteur/useCharityParticipants'
import { Skeleton } from '@/components/ui/skeleton'
import AddParticipantModal from './AddParticipantModal'
import { useCharityGroups } from '@/hooks/bienfaiteur/useCharityGroups'

interface CharityGroupsSectionProps {
  eventId: string
}

export default function CharityGroupsSection({ eventId }: CharityGroupsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const { data: groupParticipants, isLoading } = useCharityParticipants(eventId, 'group')
  const { data: allGroups } = useCharityGroups()

  // Enrichir les participants avec les infos du groupe
  const enrichedGroups = groupParticipants?.map(participant => {
    const groupInfo = allGroups?.find(g => g.id === participant.groupId)
    return {
      ...participant,
      groupName: groupInfo?.name || `Groupe #${participant.groupId?.slice(0, 8)}`,
      groupLabel: groupInfo?.label
    }
  }) || []

  // Filtrage
  const filtered = enrichedGroups.filter(group => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return group.groupName.toLowerCase().includes(query)
  })

  // Tri par montant total décroissant
  const sorted = [...filtered].sort((a, b) => b.totalAmount - a.totalAmount)

  const totalPages = Math.ceil(sorted.length / itemsPerPage)
  const paginatedGroups = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calcul des stats
  const totalAmount = sorted.reduce((sum, g) => sum + g.totalAmount, 0)
  const totalContributions = sorted.reduce((sum, g) => sum + g.contributionsCount, 0)

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{sorted.length}</div>
                <div className="text-sm text-gray-600">Groupes participants</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">FCFA</span>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalAmount.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total collecté</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600">#</span>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalContributions}</div>
                <div className="text-sm text-gray-600">Contributions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un groupe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button onClick={() => setIsAddOpen(true)} className="bg-[#234D65] hover:bg-[#2c5a73]">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un groupe
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grille des groupes */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : paginatedGroups.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedGroups.map((group, index) => (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {index + 1 + (currentPage - 1) * itemsPerPage}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-lg">{group.groupName}</div>
                        {group.groupLabel && (
                          <Badge variant="secondary" className="mt-1">
                            {group.groupLabel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Contributions</span>
                      <Badge variant="outline">{group.contributionsCount}</Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total collecté</span>
                      <span className="font-bold text-[#234D65]">
                        {group.totalAmount.toLocaleString()} FCFA
                      </span>
                    </div>

                    {group.lastContributionAt && (() => {
                      const safeDate = group.lastContributionAt instanceof Date 
                        ? group.lastContributionAt 
                        : new Date(group.lastContributionAt)
                      return !isNaN(safeDate.getTime()) ? (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          Dernière contribution : {safeDate.toLocaleDateString('fr-FR')}
                        </div>
                      ) : null
                    })()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} sur {totalPages} ({sorted.length} groupes)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="mb-4">Aucun groupe participant pour le moment</p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier groupe
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal d'ajout - uniquement pour les groupes */}
      <AddParticipantModal
        eventId={eventId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        allowedTypes={['group']}
      />
    </div>
  )
}

