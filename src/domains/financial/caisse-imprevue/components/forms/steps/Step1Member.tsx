/**
 * Étape 1 : Sélection du membre + Motif de la demande
 */

'use client'

import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import MemberSearchInput from '@/components/vehicule/MemberSearchInput'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { useEffect } from 'react'
import type { CaisseImprevueDemandFormInput } from '../../../hooks/useDemandForm'
import type { User } from '@/types/types'

interface Step1MemberProps {
  form: UseFormReturn<CaisseImprevueDemandFormInput>
}

export function Step1Member({ form }: Step1MemberProps) {
  const memberId = form.watch('memberId')
  const memberRepository = RepositoryFactory.getMemberRepository()

  // Charger les infos du membre sélectionné
  useEffect(() => {
    const loadMemberInfo = async () => {
      if (memberId) {
        const member = await memberRepository.getMemberById(memberId)
        if (member) {
          form.setValue('memberFirstName', member.firstName || '')
          form.setValue('memberLastName', member.lastName || '')
          form.setValue('memberEmail', member.email || '')
          form.setValue('memberContacts', member.contacts || [])
          form.setValue('memberMatricule', member.matricule || '')
          form.setValue('memberPhone', member.contacts?.[0] || '')
        }
      }
    }
    loadMemberInfo()
  }, [memberId, form, memberRepository])

  const handleMemberSelect = (selectedMemberId: string, member: User | null) => {
    form.setValue('memberId', selectedMemberId)
    if (member) {
      form.setValue('memberFirstName', member.firstName || '')
      form.setValue('memberLastName', member.lastName || '')
      form.setValue('memberEmail', member.email || '')
      form.setValue('memberContacts', member.contacts || [])
      form.setValue('memberMatricule', member.matricule || '')
      form.setValue('memberPhone', member.contacts?.[0] || '')
    }
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
