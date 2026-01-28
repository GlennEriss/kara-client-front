/**
 * Étape 1 : Sélection du membre + Motif de la demande
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, X } from 'lucide-react'
import MemberSearchInput from '@/components/vehicule/MemberSearchInput'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { useEffect, useState } from 'react'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'
import type { User } from '@/types/types'

interface Step1MemberProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step1Member({ form }: Step1MemberProps) {
  const memberId = form.watch('memberId')
  const memberFirstName = form.watch('memberFirstName')
  const memberLastName = form.watch('memberLastName')
  const memberMatricule = form.watch('memberMatricule')
  const memberPhone = form.watch('memberPhone')
  const memberEmail = form.watch('memberEmail')
  const [selectedMemberData, setSelectedMemberData] = useState<User | null>(null)
  const memberRepository = RepositoryFactory.getMemberRepository()

  // Charger les infos du membre sélectionné
  useEffect(() => {
    const loadMemberInfo = async () => {
      if (memberId) {
        const member = await memberRepository.getMemberById(memberId)
        if (member) {
          setSelectedMemberData(member)
          form.setValue('memberFirstName', member.firstName || '')
          form.setValue('memberLastName', member.lastName || '')
          form.setValue('memberEmail', member.email || '')
          form.setValue('memberContacts', member.contacts || [])
          form.setValue('memberMatricule', member.matricule || '')
          form.setValue('memberPhone', member.contacts?.[0] || '')
        } else {
          setSelectedMemberData(null)
        }
      } else {
        setSelectedMemberData(null)
      }
    }
    loadMemberInfo()
  }, [memberId, form, memberRepository])

  const handleMemberSelect = (selectedMemberId: string, member: User | null) => {
    form.setValue('memberId', selectedMemberId)
    setSelectedMemberData(member)
    if (member) {
      form.setValue('memberFirstName', member.firstName || '')
      form.setValue('memberLastName', member.lastName || '')
      form.setValue('memberEmail', member.email || '')
      form.setValue('memberContacts', member.contacts || [])
      form.setValue('memberMatricule', member.matricule || '')
      form.setValue('memberPhone', member.contacts?.[0] || '')
    }
  }

  const handleClearMember = () => {
    form.setValue('memberId', '')
    form.setValue('memberFirstName', '')
    form.setValue('memberLastName', '')
    form.setValue('memberEmail', '')
    form.setValue('memberContacts', [])
    form.setValue('memberMatricule', '')
    form.setValue('memberPhone', '')
    setSelectedMemberData(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="member-search">Rechercher un membre</Label>
        <p className="text-xs text-kara-neutral-500 mb-2">
          Recherchez et sélectionnez le membre pour qui créer la demande
        </p>
        <MemberSearchInput
          value={memberId}
          onChange={handleMemberSelect}
          selectedMemberId={memberId}
          error={form.formState.errors.memberId?.message}
          label=""
          placeholder="Rechercher par nom, prénom ou matricule..."
          isRequired
          data-testid="step1-member-search"
        />
        {form.formState.errors.memberId && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.memberId.message}</p>
        )}

        {/* Affichage du membre sélectionné */}
        {memberId && (selectedMemberData || (memberFirstName && memberLastName)) && (
          <Card className="mt-3 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  {selectedMemberData?.photoURL ? (
                    <AvatarImage
                      src={selectedMemberData.photoURL}
                      alt={`Photo de ${memberFirstName} ${memberLastName}`}
                    />
                  ) : (
                    <AvatarFallback className="bg-[#234D65] text-white">
                      {`${memberFirstName?.[0] || ''}${memberLastName?.[0] || ''}`.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {memberFirstName} {memberLastName}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    {memberMatricule && (
                      <span className="font-mono">Matricule: {memberMatricule}</span>
                    )}
                    {memberPhone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{memberPhone}</span>
                      </div>
                    )}
                    {memberEmail && (
                      <span className="text-xs">{memberEmail}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearMember}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Supprimer la sélection"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <Label htmlFor="cause">
          Motif de la demande <span className="text-red-500">*</span>
        </Label>
        <p className="text-xs text-kara-neutral-500 mb-2">
          Décrivez la raison de la demande (10-500 caractères)
        </p>
        <Textarea
          id="cause"
          {...form.register('cause', {
            required: 'Le motif est requis',
            minLength: { value: 10, message: 'Le motif doit contenir au moins 10 caractères' },
            maxLength: { value: 500, message: 'Le motif ne peut pas dépasser 500 caractères' },
          })}
          placeholder="Ex: Aide pour frais médicaux urgents suite à une hospitalisation..."
          className="min-h-[120px]"
          data-testid="demand-cause-textarea"
        />
        {form.formState.errors.cause && (
          <p className="text-xs text-red-500 mt-1">{form.formState.errors.cause.message}</p>
        )}
        <p className="text-xs text-kara-neutral-500 mt-1">
          {form.watch('cause')?.length || 0} / 500 caractères
        </p>
      </div>
    </div>
  )
}
