'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { charityContributionSchema, CharityContributionFormData } from '@/schemas/bienfaiteur.schema'
import { useAddParticipantWithContribution } from '@/hooks/bienfaiteur/useCharityContributions'
import { Calendar, Upload, X, User, Users, DollarSign, Gift } from 'lucide-react'
import Image from 'next/image'
import MemberGroupSearch from './MemberGroupSearch'
import { useUser } from '@/hooks/useMembers'
import { useCharityGroups } from '@/hooks/bienfaiteur/useCharityGroups'
import { cn } from '@/lib/utils'
import { CharityContributionInput, PaymentMode } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'
import { uploadContributionProof } from '@/services/bienfaiteur/CharityMediaService'
import { useUpdateCharityContribution } from '@/hooks/bienfaiteur/useCharityContributions'

interface AddContributionFormProps {
  eventId: string
  isOpen: boolean
  onClose: () => void
}

export default function AddContributionForm({ eventId, isOpen, onClose }: AddContributionFormProps) {
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [participantType, setParticipantType] = useState<'member' | 'group'>('member')
  const [contributionType, setContributionType] = useState<'money' | 'in_kind'>('money')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [_selectedMemberName, setSelectedMemberName] = useState<string>('')
  const [_selectedGroupName, setSelectedGroupName] = useState<string>('')

  const { mutate: addContribution, isPending } = useAddParticipantWithContribution()
  const { mutate: updateContribution } = useUpdateCharityContribution()
  const { user } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch: _watch,
    reset,
    resetField
  } = useForm<CharityContributionFormData>({
    resolver: zodResolver(charityContributionSchema) as any,
    defaultValues: {
      participantType: 'member',
      contributionType: 'money',
      paymentMethod: 'cash',
      status: 'confirmed',
      contributionDate: new Date().toISOString().split('T')[0],
    }
  })

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La taille du fichier ne doit pas dépasser 10MB')
        return
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
        toast.error('Format non supporté. Utilisez JPG, PNG, WEBP ou PDF')
        return
      }

      setProofFile(file)
      setValue('proofFile', file)
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setProofPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setProofPreview(null)
      }
    }
  }

  const removeProof = () => {
    setProofFile(null)
    setProofPreview(null)
    resetField('proofFile')
  }

  const handleParticipantSelect = (id: string, type: 'member' | 'group', displayName: string) => {
    if (type === 'member') {
      setSelectedMemberId(id)
      setSelectedMemberName(displayName) // _selectedMemberName
      setValue('memberId', id)
      setValue('groupId', undefined)
      setSelectedGroupId('')
      setSelectedGroupName('')
    } else {
      setSelectedGroupId(id)
      setSelectedGroupName(displayName) // _selectedGroupName
      setValue('groupId', id)
      setValue('memberId', undefined)
      setSelectedMemberId('')
      setSelectedMemberName('')
    }
  }

  const onSubmit = async (data: CharityContributionFormData) => {
    try {
      // Validation : au moins un ID doit être fourni
      if (!selectedMemberId && !selectedGroupId) {
        toast.error('Veuillez sélectionner un membre ou un groupe')
        return
      }

      const contributionDate = new Date(data.contributionDate)
      
      // Validation de la date
      if (!data.contributionDate || isNaN(contributionDate.getTime())) {
        toast.error('La date de contribution est invalide')
        return
      }

      console.log('📅 Date de contribution:', {
        raw: data.contributionDate,
        parsed: contributionDate,
        isValid: !isNaN(contributionDate.getTime())
      })

      const contributionPayload: CharityContributionInput = {
        contributionType: data.contributionType,
        status: data.status || 'confirmed',
        contributionDate,
        notes: data.notes?.trim() ? data.notes.trim() : undefined,
        proofType: proofFile
          ? proofFile.type === 'application/pdf'
            ? 'pdf'
            : proofFile.type.startsWith('image/')
              ? 'image'
              : 'other'
          : undefined,
      }
      
      console.log('📦 Payload contribution:', contributionPayload)

      if (data.contributionType === 'money') {
        const now = new Date()
        contributionPayload.payment = {
          amount: Number(data.amount),
          mode: data.paymentMethod as PaymentMode,
          paymentType: 'Charity',
          date: contributionDate,
          time: now.toTimeString().slice(0, 5), // Format HH:mm
          acceptedBy: user?.uid || 'system',
          recordedBy: user?.uid || 'system',
          recordedByName: user?.displayName || user?.email || 'Admin',
          recordedAt: now,
        }
      } else {
        contributionPayload.inKindDescription = data.inKindDescription || ''
        if (data.estimatedValue) {
          contributionPayload.estimatedValue = Number(data.estimatedValue)
        }
      }

      addContribution({
        eventId,
        memberId: selectedMemberId || undefined,
        groupId: selectedGroupId || undefined,
        contribution: contributionPayload,
      }, {
        onSuccess: async (result) => {
          // Upload de la preuve si elle existe
          if (proofFile && result?.contributionId) {
            try {
              toast.info('Upload de la preuve en cours...')
              const uploadResult = await uploadContributionProof(proofFile, eventId, result.contributionId)
              
              // Mettre à jour la contribution avec l'URL de la preuve
              updateContribution({
                eventId,
                contributionId: result.contributionId,
                updates: {
                  proofUrl: uploadResult.url,
                  proofPath: uploadResult.path,
                  proofType: proofFile.type === 'application/pdf' ? 'pdf' : proofFile.type.startsWith('image/') ? 'image' : 'other'
                }
              }, {
                onSuccess: () => {
                  toast.success('Contribution ajoutée avec succès!')
                  handleClose()
                },
                onError: (error: any) => {
                  toast.warning('Contribution créée mais erreur lors de l\'upload de la preuve: ' + (error.message || 'Erreur inconnue'))
                  handleClose()
                }
              })
            } catch (uploadError: any) {
              toast.warning('Contribution créée mais erreur lors de l\'upload de la preuve: ' + (uploadError.message || 'Erreur inconnue'))
              handleClose()
            }
          } else {
            toast.success('Contribution ajoutée avec succès!')
            handleClose()
          }
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors de l\'ajout de la contribution')
        }
      })
    } catch (error) {
      toast.error('Une erreur est survenue')
    }
  }

  const handleClose = () => {
    reset()
    setProofFile(null)
    setProofPreview(null)
    setSelectedMemberId('')
    setSelectedGroupId('')
    setSelectedMemberName('')
    setSelectedGroupName('')
    setParticipantType('member')
    setContributionType('money')
    onClose()
  }

  // Récupérer les infos du membre/groupe sélectionné pour affichage
  const { data: selectedMemberData } = useUser(selectedMemberId)
  const { data: groups } = useCharityGroups()
  const selectedGroupData = groups?.find(g => g.id === selectedGroupId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Ajouter une contribution</DialogTitle>
          <DialogDescription>
            Enregistrez une nouvelle contribution pour cet évènement de charité
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Type de contributeur */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <Label className="text-base font-semibold">Type de contributeur *</Label>
              <RadioGroup
                value={participantType}
                onValueChange={(value) => {
                  setParticipantType(value as 'member' | 'group')
                  setValue('participantType', value as 'member' | 'group')
                  setSelectedMemberId('')
                  setSelectedGroupId('')
                  setSelectedMemberName('')
                  setSelectedGroupName('')
                  setValue('memberId', undefined)
                  setValue('groupId', undefined)
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="member" id="member" />
                  <Label htmlFor="member" className="cursor-pointer flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Membre individuel
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="group" id="group" />
                  <Label htmlFor="group" className="cursor-pointer flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Groupe
                  </Label>
                </div>
              </RadioGroup>

              {/* Recherche membre/groupe */}
              <MemberGroupSearch
                participantType={participantType}
                onSelect={handleParticipantSelect}
                selectedId={participantType === 'member' ? selectedMemberId : selectedGroupId}
                selectedType={participantType}
                error={errors.memberId?.message || errors.groupId?.message}
                label={participantType === 'member' ? 'Rechercher un membre' : 'Rechercher un groupe'}
              />

              {/* Affichage du membre/groupe sélectionné */}
              {(selectedMemberId || selectedGroupId) && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {participantType === 'member' && selectedMemberData ? (
                        <>
                          <Avatar>
                            <AvatarImage src={selectedMemberData.photoURL || ''} alt={`Photo de ${selectedMemberData.firstName} ${selectedMemberData.lastName}`} />
                            <AvatarFallback>
                              {`${selectedMemberData.firstName?.[0] || ''}${selectedMemberData.lastName?.[0] || ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">
                              {selectedMemberData.firstName} {selectedMemberData.lastName}
                            </div>
                            <div className="text-sm text-gray-600">
                              {selectedMemberData.matricule && `Matricule: ${selectedMemberData.matricule}`}
                              {selectedMemberData.contacts?.[0] && ` • ${selectedMemberData.contacts[0]}`}
                            </div>
                          </div>
                        </>
                      ) : selectedGroupData ? (
                        <>
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{selectedGroupData.name}</div>
                            {selectedGroupData.label && (
                              <Badge variant="secondary" className="mt-1">
                                {selectedGroupData.label}
                              </Badge>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Type de contribution */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <Label className="text-base font-semibold">Type de contribution *</Label>
              <RadioGroup
                value={contributionType}
                onValueChange={(value) => {
                  setContributionType(value as 'money' | 'in_kind')
                  setValue('contributionType', value as 'money' | 'in_kind')
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="money" id="money" />
                  <Label htmlFor="money" className="cursor-pointer flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Espèces / Virement
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="in_kind" id="in_kind" />
                  <Label htmlFor="in_kind" className="cursor-pointer flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    Don en nature
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Champs conditionnels selon le type */}
          {contributionType === 'money' ? (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant *</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Ex. 10000"
                        {...register('amount')}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                        FCFA
                      </span>
                    </div>
                    {errors.amount && (
                      <p className="text-sm text-red-500">{errors.amount.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Méthode de paiement *</Label>
                    <Select onValueChange={(value: any) => setValue('paymentMethod', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Espèces</SelectItem>
                        <SelectItem value="bank_transfer">Virement bancaire</SelectItem>
                        <SelectItem value="airtel_money">Airtel Money</SelectItem>
                        <SelectItem value="mobicash">Mobicash</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.paymentMethod && (
                      <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inKindDescription">Description du don *</Label>
                  <Textarea
                    id="inKindDescription"
                    placeholder="Décrivez le don en nature (ex: 50 cartables, 30 stylos, vêtements...)"
                    rows={3}
                    {...register('inKindDescription')}
                  />
                  {errors.inKindDescription && (
                    <p className="text-sm text-red-500">{errors.inKindDescription.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Valeur estimée (optionnel)</Label>
                  <div className="relative">
                    <Input
                      id="estimatedValue"
                      type="number"
                      placeholder="Ex. 50000"
                      {...register('estimatedValue')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      FCFA
                    </span>
                  </div>
                  {errors.estimatedValue && (
                    <p className="text-sm text-red-500">{errors.estimatedValue.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Date de contribution */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label htmlFor="contributionDate">Date de contribution *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="contributionDate"
                    type="date"
                    className="pl-10"
                    {...register('contributionDate')}
                  />
                </div>
                {errors.contributionDate && (
                  <p className="text-sm text-red-500">{errors.contributionDate.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preuve (obligatoire) */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label htmlFor="proof">Preuve de contribution *</Label>
                {!proofPreview && !proofFile ? (
                  <div className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center hover:border-gray-400 transition-colors",
                    errors.proofFile ? "border-red-300 bg-red-50" : "border-gray-300"
                  )}>
                    <Label htmlFor="proof" className="cursor-pointer">
                      <Upload className={cn(
                        "w-8 h-8 mx-auto mb-2",
                        errors.proofFile ? "text-red-400" : "text-gray-400"
                      )} />
                      <div className={cn(
                        "text-sm font-medium",
                        errors.proofFile ? "text-red-600" : "text-gray-600"
                      )}>
                        Cliquez pour télécharger un fichier
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Image (JPG, PNG, WEBP) ou PDF • Max 10MB
                      </div>
                    </Label>
                    <Input
                      id="proof"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    {proofPreview ? (
                      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={proofPreview}
                          alt="Aperçu de la preuve"
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-bold">PDF</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{proofFile?.name}</p>
                            <p className="text-xs text-gray-500">
                              {((proofFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removeProof}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {errors.proofFile && (
                  <p className="text-sm text-red-500">{errors.proofFile.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes additionnelles sur cette contribution..."
                  rows={2}
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="text-sm text-red-500">{errors.notes.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-3">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || (!selectedMemberId && !selectedGroupId) || !proofFile} className="bg-[#234D65] hover:bg-[#2c5a73]">
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Ajout en cours...
                </>
              ) : (
                'Ajouter la contribution'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

