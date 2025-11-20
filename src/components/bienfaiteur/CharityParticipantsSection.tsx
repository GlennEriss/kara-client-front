'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, UserMinus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCharityParticipants, useRemoveCharityParticipant } from '@/hooks/bienfaiteur/useCharityParticipants'
import { useAllMembers } from '@/hooks/useMembers'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import AddParticipantModal from './AddParticipantModal'

interface CharityParticipantsSectionProps {
  eventId: string
}

export default function CharityParticipantsSection({ eventId }: CharityParticipantsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'member' | 'group'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null)
  const itemsPerPage = 12

  const { data: participants, isLoading } = useCharityParticipants(eventId, typeFilter === 'all' ? undefined : typeFilter)
  const { data: membersData } = useAllMembers({}, 1, 1000)
  const { mutate: removeParticipant, isPending: isRemoving } = useRemoveCharityParticipant()

  const members = membersData?.data || []

  // Filtrage
  const filtered = participants?.filter(participant => {
    if (searchQuery) {
      // TODO: Recherche par nom
    }
    return true
  }) || []

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedParticipants = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getMemberInfo = (memberId?: string) => {
    if (!memberId) return null
    return members.find(m => m.id === memberId)
  }

  const handleRemoveParticipant = () => {
    if (!participantToRemove) return

    removeParticipant(
      { eventId, participantId: participantToRemove },
      {
        onSuccess: () => {
          toast.success('Participant retiré avec succès')
          setParticipantToRemove(null)
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors du retrait du participant')
        }
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtres et actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un participant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={typeFilter === 'member' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('member')}
              >
                Membres
              </Button>
              <Button
                variant={typeFilter === 'group' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('group')}
              >
                Groupes
              </Button>

              <Button onClick={() => setIsAddOpen(true)} className="bg-[#234D65] hover:bg-[#2c5a73]">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille des participants */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : paginatedParticipants.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedParticipants.map((participant) => {
              const memberInfo = getMemberInfo(participant.memberId)
              
              return (
                <Card key={participant.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={memberInfo?.photoUrl || ''} />
                          <AvatarFallback>
                            {participant.participantType === 'member' && memberInfo
                              ? `${memberInfo.firstName?.[0] || ''}${memberInfo.lastName?.[0] || ''}`
                              : 'G'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {participant.participantType === 'member' && memberInfo
                              ? `${memberInfo.firstName} ${memberInfo.lastName}`
                              : `Groupe #${participant.groupId?.slice(0, 8)}`}
                          </div>
                          <Badge variant={participant.participantType === 'member' ? 'default' : 'secondary'} className="mt-1">
                            {participant.participantType === 'member' ? 'Membre' : 'Groupe'}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setParticipantToRemove(participant.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Contributions:</span>
                        <span className="font-medium">{participant.contributionsCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total donné:</span>
                        <span className="font-medium">{participant.totalAmount.toLocaleString()} FCFA</span>
                      </div>
                      {participant.lastContributionAt && (() => {
                        const safeDate = participant.lastContributionAt instanceof Date 
                          ? participant.lastContributionAt 
                          : new Date(participant.lastContributionAt)
                        return !isNaN(safeDate.getTime()) ? (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dernière contrib.:</span>
                            <span className="font-medium">
                              {format(safeDate, 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} sur {totalPages} ({filtered.length} participants)
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
            <p className="mb-4">Aucun participant pour le moment</p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier participant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal d'ajout */}
      <AddParticipantModal
        eventId={eventId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Confirmation de suppression */}
      <Dialog open={!!participantToRemove} onOpenChange={() => setParticipantToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer le participant</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir retirer ce participant de l'évènement ?
              Cette action ne supprimera pas ses contributions existantes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParticipantToRemove(null)} disabled={isRemoving}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRemoveParticipant} disabled={isRemoving}>
              {isRemoving ? 'Retrait en cours...' : 'Retirer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

