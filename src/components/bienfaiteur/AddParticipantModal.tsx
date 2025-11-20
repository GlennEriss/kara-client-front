'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search } from 'lucide-react'
import { useAddCharityParticipant } from '@/hooks/bienfaiteur/useCharityParticipants'
import { useAllMembers } from '@/hooks/useMembers'
import { useCharityGroups } from '@/hooks/bienfaiteur/useCharityGroups'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface AddParticipantModalProps {
  eventId: string
  isOpen: boolean
  onClose: () => void
  allowedTypes?: ('member' | 'group')[] // Types de participants autorisés (par défaut: les deux)
}

export default function AddParticipantModal({ eventId, isOpen, onClose, allowedTypes = ['member', 'group'] }: AddParticipantModalProps) {
  // Déterminer le type initial selon les types autorisés
  const initialType = allowedTypes.includes('member') ? 'member' : 'group'
  const [participantType, setParticipantType] = useState<'member' | 'group'>(initialType)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { mutate: addParticipant, isPending } = useAddCharityParticipant()
  const { data: membersData, isLoading: isLoadingMembers } = useAllMembers({}, 1, 1000)
  const { data: groups, isLoading: isLoadingGroups } = useCharityGroups()

  const members = membersData?.data || []

  // Filtrage
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      member.firstName?.toLowerCase().includes(query) ||
      member.lastName?.toLowerCase().includes(query)
    )
  })

  const filteredGroups = groups?.filter(group => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return group.name.toLowerCase().includes(query)
  })

  const handleAdd = () => {
    if (!selectedId) {
      toast.error('Veuillez sélectionner un participant')
      return
    }

    addParticipant(
      {
        eventId,
        participantType,
        memberId: participantType === 'member' ? selectedId : undefined,
        groupId: participantType === 'group' ? selectedId : undefined
      },
      {
        onSuccess: () => {
          toast.success('Participant ajouté avec succès!')
          handleClose()
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors de l\'ajout du participant')
        }
      }
    )
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedId(null)
    setParticipantType(initialType)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {allowedTypes.length === 1 
              ? allowedTypes[0] === 'group' 
                ? 'Ajouter un groupe' 
                : 'Ajouter un membre'
              : 'Ajouter un participant'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Type de participant - seulement si plusieurs types autorisés */}
          {allowedTypes.length > 1 && (
            <div className="space-y-2">
              <Label>Type de participant</Label>
              <RadioGroup
                value={participantType}
                onValueChange={(value) => {
                  setParticipantType(value as 'member' | 'group')
                  setSelectedId(null)
                  setSearchQuery('')
                }}
                className="flex gap-4"
              >
                {allowedTypes.includes('member') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="member" id="modal-member" />
                    <Label htmlFor="modal-member" className="cursor-pointer">Membre</Label>
                  </div>
                )}
                {allowedTypes.includes('group') && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="group" id="modal-group" />
                    <Label htmlFor="modal-group" className="cursor-pointer">Groupe</Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Rechercher un ${participantType === 'member' ? 'membre' : 'groupe'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Liste des résultats */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {participantType === 'member' ? (
              isLoadingMembers ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredMembers.length > 0 ? (
                <div className="divide-y">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedId === member.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedId(member.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.photoURL || ''} />
                          <AvatarFallback>
                            {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">
                            {member.firstName} {member.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.contacts?.[0] || 'Pas de contact'}
                          </div>
                        </div>
                        {selectedId === member.id && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  Aucun membre trouvé
                </div>
              )
            ) : (
              isLoadingGroups ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredGroups && filteredGroups.length > 0 ? (
                <div className="divide-y">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedId === group.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedId(group.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-600">G</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{group.name}</div>
                          {group.label && (
                            <div className="text-sm text-gray-500">{group.label}</div>
                          )}
                        </div>
                        {selectedId === group.id && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  Aucun groupe trouvé
                </div>
              )
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleAdd} disabled={!selectedId || isPending} className="bg-[#234D65] hover:bg-[#2c5a73]">
            {isPending ? 'Ajout en cours...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

