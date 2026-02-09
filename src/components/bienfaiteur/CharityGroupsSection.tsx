'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCharityParticipants, useRemoveCharityParticipant } from '@/hooks/bienfaiteur/useCharityParticipants'
import { Skeleton } from '@/components/ui/skeleton'
import AddParticipantModal from './AddParticipantModal'
import { useCharityGroups } from '@/hooks/bienfaiteur/useCharityGroups'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface CharityGroupsSectionProps {
  eventId: string
}

export default function CharityGroupsSection({ eventId }: CharityGroupsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [groupToRemove, setGroupToRemove] = useState<string | null>(null)
  const itemsPerPage = 12

  const { data: groupParticipants, isLoading } = useCharityParticipants(eventId, 'group')
  const { data: allGroups } = useCharityGroups()
  const { mutate: removeParticipant, isPending: isRemoving } = useRemoveCharityParticipant()

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

  const handleRemoveGroup = () => {
    if (!groupToRemove) return

    removeParticipant(
      { eventId, participantId: groupToRemove },
      {
        onSuccess: () => {
          toast.success('Groupe retiré avec succès')
          setGroupToRemove(null)
          // Réinitialiser à la page 1 si la page actuelle est vide
          if (paginatedGroups.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1)
          }
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors du retrait du groupe')
        }
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/55 shadow-[0_12px_26px_-22px_rgba(16,58,95,0.86)]">
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

        <Card className="border-emerald-100/70 bg-gradient-to-br from-white to-emerald-50/60 shadow-[0_12px_26px_-22px_rgba(18,89,63,0.72)]">
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

        <Card className="border-violet-100/70 bg-gradient-to-br from-white to-violet-50/60 shadow-[0_12px_26px_-22px_rgba(72,53,132,0.72)]">
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
      <Card className="border-cyan-100/70 bg-white/80 shadow-[0_12px_26px_-22px_rgba(16,58,95,0.8)] backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un groupe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 border-cyan-100 bg-white pl-10"
              />
            </div>

            <Button onClick={() => setIsAddOpen(true)} className="h-11 bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white hover:opacity-95">
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
            <Skeleton key={i} className="h-40 rounded-xl border border-cyan-100/70" />
          ))}
        </div>
      ) : paginatedGroups.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedGroups.map((group, index) => (
              <Card key={group.id} className="border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/45 shadow-[0_12px_26px_-22px_rgba(16,58,95,0.8)] transition-all hover:-translate-y-0.5">
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
                      <span className="text-sm text-slate-600">Contributions</span>
                      <Badge variant="outline">{group.contributionsCount}</Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Total collecté</span>
                      <span className="font-bold text-[#234D65]">
                        {group.totalAmount.toLocaleString()} FCFA
                      </span>
                    </div>

                    {group.lastContributionAt && (() => {
                      const safeDate = group.lastContributionAt instanceof Date 
                        ? group.lastContributionAt 
                        : new Date(group.lastContributionAt)
                      return !isNaN(safeDate.getTime()) ? (
                        <div className="border-t pt-2 text-xs text-slate-500">
                          Dernière contribution : {safeDate.toLocaleDateString('fr-FR')}
                        </div>
                      ) : null
                    })()}

                    {/* Bouton supprimer - seulement si 0 contributions */}
                    <div className="pt-3 border-t mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGroupToRemove(group.id)}
                        disabled={group.contributionsCount > 0}
                        className={`w-full ${group.contributionsCount > 0 ? 'opacity-50 cursor-not-allowed' : 'text-red-600 hover:text-red-700 hover:bg-red-50'}`}
                        title={group.contributionsCount > 0 ? 'Impossible de supprimer un groupe ayant des contributions' : 'Retirer ce groupe'}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {group.contributionsCount > 0 ? 'Contributions existantes' : 'Retirer le groupe'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="border-cyan-100/70 bg-white/80 shadow-[0_12px_26px_-22px_rgba(16,58,95,0.8)]">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="text-sm text-slate-600">
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
        <Card className="border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/50">
          <CardContent className="p-12 text-center text-slate-500">
            <Users className="mx-auto mb-4 h-16 w-16 text-slate-400" />
            <p className="mb-4">Aucun groupe participant pour le moment</p>
            <Button onClick={() => setIsAddOpen(true)} className="bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white hover:opacity-95">
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

      {/* Confirmation de suppression */}
      <Dialog open={!!groupToRemove} onOpenChange={() => setGroupToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer le groupe</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer ce groupe de l'évènement ?
              {(() => {
                const group = sorted.find(g => g.id === groupToRemove)
                if (group && group.contributionsCount > 0) {
                  return ` Ce groupe a ${group.contributionsCount} contribution(s) et ne peut pas être retiré.`
                }
                return ' Cette action est irréversible.'
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupToRemove(null)} disabled={isRemoving}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRemoveGroup} 
              disabled={isRemoving || (() => {
                const group = sorted.find(g => g.id === groupToRemove)
                return group ? group.contributionsCount > 0 : false
              })()}
            >
              {isRemoving ? 'Retrait en cours...' : 'Retirer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
