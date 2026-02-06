'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { creditDemandFormSchema, type CreditDemandFormInput } from '@/schemas/credit-speciale.schema'
import { useCreditDemandMutations } from '@/hooks/useCreditSpeciale'
import { useAllMembers } from '@/hooks/useMembers'
import { Loader2, User, Search, CheckCircle, Calendar, Edit } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import SelectApp from '@/components/forms/SelectApp'
import { RELATIONSHIP_OPTIONS } from '@/constantes/relationship-types'
import type { CreditDemand } from '@/types/types'

interface EditCreditDemandModalProps {
  isOpen: boolean
  onClose: () => void
  demand: CreditDemand
}

function demandToFormValues(demand: CreditDemand): CreditDemandFormInput {
  const desiredDate =
    typeof demand.desiredDate === 'string'
      ? demand.desiredDate.includes('T')
        ? demand.desiredDate.slice(0, 10)
        : demand.desiredDate
      : demand.desiredDate
        ? new Date(demand.desiredDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
  const hasValidContacts = demand.clientContacts?.some((c) => typeof c === 'string' && c.length > 0)
  return {
    clientId: demand.clientId,
    clientFirstName: demand.clientFirstName ?? '',
    clientLastName: demand.clientLastName ?? '',
    clientContacts: hasValidContacts ? demand.clientContacts! : [' '],
    creditType: demand.creditType,
    amount: demand.amount,
    monthlyPaymentAmount: demand.monthlyPaymentAmount,
    desiredDate,
    cause: demand.cause ?? '',
    status: demand.status,
    guarantorId: demand.guarantorId ?? '',
    guarantorFirstName: demand.guarantorFirstName ?? '',
    guarantorLastName: demand.guarantorLastName ?? '',
    guarantorRelation: demand.guarantorRelation ?? '',
    guarantorIsMember: demand.guarantorIsMember ?? false,
  }
}

export default function EditCreditDemandModal({
  isOpen,
  onClose,
  demand,
}: EditCreditDemandModalProps) {
  const { updateDemand } = useCreditDemandMutations()
  const { data: membersData } = useAllMembers({}, 1, 1000)
  const members = membersData?.data || []

  const [selectedGuarantorId, setSelectedGuarantorId] = useState<string | undefined>(demand.guarantorId ?? undefined)
  const [guarantorSearch, setGuarantorSearch] = useState('')

  const form = useForm<CreditDemandFormInput>({
    resolver: zodResolver(creditDemandFormSchema),
    defaultValues: demandToFormValues(demand),
  })

  useEffect(() => {
    if (isOpen && demand) {
      const values = demandToFormValues(demand)
      form.reset(values)
      setSelectedGuarantorId(demand.guarantorId ?? undefined)
    }
  }, [isOpen, demand, form])

  const filteredGuarantors = members.filter(
    (m) =>
      m.id !== demand.clientId &&
      ((m.firstName || '').toLowerCase().includes(guarantorSearch.toLowerCase()) ||
        (m.lastName || '').toLowerCase().includes(guarantorSearch.toLowerCase()) ||
        (m.matricule || '').toLowerCase().includes(guarantorSearch.toLowerCase()))
  ).slice(0, 10)

  const handleGuarantorSelect = (memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    if (member) {
      setSelectedGuarantorId(memberId)
      form.setValue('guarantorId', memberId)
      form.setValue('guarantorFirstName', member.firstName || '')
      form.setValue('guarantorLastName', member.lastName ?? '')
      form.setValue('guarantorIsMember', true)
      setGuarantorSearch('')
    }
  }

  const onSubmit = async (data: CreditDemandFormInput) => {
    try {
      await updateDemand.mutateAsync({
        demandId: demand.id,
        data: {
          creditType: data.creditType,
          amount: data.amount,
          monthlyPaymentAmount: data.monthlyPaymentAmount,
          desiredDate: data.desiredDate,
          cause: data.cause,
          guarantorId: data.guarantorId,
          guarantorFirstName: data.guarantorFirstName,
          guarantorLastName: data.guarantorLastName,
          guarantorRelation: data.guarantorRelation,
          guarantorIsMember: data.guarantorIsMember ?? false,
        },
      })
      onClose()
    } catch {
      // Erreur gérée par le hook
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62] flex items-center gap-2">
            <Edit className="h-6 w-6" />
            Modifier la demande de crédit
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de la demande #{demand.id} (client non modifiable)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Type de crédit */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Type de crédit</h3>
                <FormField
                  control={form.control}
                  name="creditType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de crédit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SPECIALE">Spéciale (≤7 mois)</SelectItem>
                          <SelectItem value="FIXE">Fixe (illimité)</SelectItem>
                          <SelectItem value="AIDE">Aide (≤3 mois)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {form.watch('creditType') === 'SPECIALE' && 'Crédit spéciale : durée maximale de 7 mois'}
                        {form.watch('creditType') === 'FIXE' && "Crédit fixe : durée illimitée jusqu'au remboursement complet"}
                        {form.watch('creditType') === 'AIDE' && 'Crédit aide : durée maximale de 3 mois'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Client (lecture seule) */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Client</h3>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-500 shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {[demand.clientFirstName, demand.clientLastName].filter(Boolean).join(' ') || 'Client'}
                      </div>
                      <div className="text-sm text-gray-600">Client (non modifiable)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Informations du crédit */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Informations du crédit</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Montant (FCFA)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 500000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyPaymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensualité souhaitée (FCFA)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 100000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desiredDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date souhaitée du crédit</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input type="date" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="cause"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cause / Motif du crédit</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez la raison de la demande de crédit..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Minimum 10 caractères, maximum 500 caractères</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 4: Garant */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Garant</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rechercher un garant</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nom, prénom ou matricule..."
                        value={guarantorSearch}
                        onChange={(e) => setGuarantorSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {guarantorSearch && filteredGuarantors.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                        {filteredGuarantors.map((member) => (
                          <div
                            key={member.id}
                            onClick={() => handleGuarantorSelect(member.id)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                          >
                            <User className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">
                                {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.matricule || 'Membre'}
                              </div>
                              <div className="text-sm text-gray-500">Matricule: {member.matricule}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedGuarantorId && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-900">
                            {[form.watch('guarantorFirstName'), form.watch('guarantorLastName')].filter(Boolean).join(' ') || 'Garant'}
                          </div>
                          <div className="text-sm text-blue-700">Garant sélectionné</div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedGuarantorId && (
                    <FormField
                      control={form.control}
                      name="guarantorRelation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900">Lien de parenté</FormLabel>
                          <FormControl>
                            <SelectApp
                              options={RELATIONSHIP_OPTIONS}
                              value={field.value || ''}
                              onChange={field.onChange}
                              placeholder="Sélectionner le lien de parenté"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={updateDemand.isPending}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={updateDemand.isPending}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                {updateDemand.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
