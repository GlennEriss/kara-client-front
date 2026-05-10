'use client'

import SelectApp from '@/components/forms/SelectApp'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RELATIONSHIP_OPTIONS } from '@/constantes/relationship-types'
import { useAuth } from '@/hooks/useAuth'
import { useCreditDemandMutations } from '@/hooks/useCreditSpeciale'
import { useAllMembers } from '@/hooks/useMembers'
import { creditDemandDefaultValues, creditDemandFormSchema, type CreditDemandFormInput } from '@/schemas/credit-speciale.schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { Calendar, CheckCircle, Loader2, Search, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface CreateCreditDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialClientId?: string
  initialCreditType?: 'SPECIALE' | 'FIXE' | 'AIDE'
  lockCreditType?: boolean
}

export default function CreateCreditDemandModal({ 
  isOpen, 
  onClose, 
  initialClientId,
  initialCreditType,
  lockCreditType = false,
}: CreateCreditDemandModalProps) {
  const { create } = useCreditDemandMutations()
  const { data: membersData } = useAllMembers({}, 1, 1000)
  const members = membersData?.data || []
  
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialClientId)
  const [selectedGuarantorId, setSelectedGuarantorId] = useState<string | undefined>()
  
  const { user } = useAuth()
  
  const form = useForm<CreditDemandFormInput>({
    resolver: zodResolver(creditDemandFormSchema),
    defaultValues: {
      ...creditDemandDefaultValues,
      clientId: initialClientId || '',
      creditType: initialCreditType || 'SPECIALE',
      status: 'PENDING',
      clientContacts: [],
      guarantorIsMember: false,
    },
  })

  useEffect(() => {
    if (isOpen && initialCreditType) {
      form.setValue('creditType', initialCreditType, { shouldValidate: true })
    }
  }, [form, initialCreditType, isOpen])

  const selectedCreditType = form.watch('creditType')
  const isSimpleCredit = selectedCreditType === 'FIXE' || selectedCreditType === 'AIDE'

  useEffect(() => {
    if (isSimpleCredit) {
      form.setValue('monthlyPaymentAmount', undefined, { shouldValidate: true })
    }
  }, [form, isSimpleCredit])

  // Recherche de membres
  const [clientSearch, setClientSearch] = useState('')
  const [guarantorSearch, setGuarantorSearch] = useState('')
  
  const filteredClients = members.filter(m =>
    (m.firstName || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (m.lastName || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (m.matricule || '').toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 10)
  
  const filteredGuarantors = members.filter(m =>
    m.id !== selectedClientId && (
      (m.firstName || '').toLowerCase().includes(guarantorSearch.toLowerCase()) ||
      (m.lastName || '').toLowerCase().includes(guarantorSearch.toLowerCase()) ||
      (m.matricule || '').toLowerCase().includes(guarantorSearch.toLowerCase())
    )
  ).slice(0, 10)


  // Mettre à jour le formulaire quand un client est sélectionné
  const handleClientSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedClientId(memberId)
      form.setValue('clientId', memberId)
      form.setValue('clientFirstName', member.firstName || '')
      form.setValue('clientLastName', member.lastName)
      form.setValue('clientContacts', member.contacts || [])
      setClientSearch('')
    }
  }

  // Mettre à jour le formulaire quand un garant est sélectionné
  const handleGuarantorSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedGuarantorId(memberId)
      form.setValue('guarantorId', memberId)
      form.setValue('guarantorFirstName', member.firstName || '')
      form.setValue('guarantorLastName', member.lastName)
      form.setValue('guarantorIsMember', true)
      setGuarantorSearch('')
    }
  }

  const onSubmit = async (data: CreditDemandFormInput) => {
    try {
      if (!user?.uid) {
        toast.error('Vous devez être connecté pour créer une demande')
        return
      }
      
      await create.mutateAsync({
        ...data,
        monthlyPaymentAmount: (data.creditType === 'FIXE' || data.creditType === 'AIDE') ? undefined : data.monthlyPaymentAmount,
        createdBy: user.uid,
        guarantorIsMember: data.guarantorIsMember ?? false,
      })
      form.reset()
      setSelectedClientId(undefined)
      setSelectedGuarantorId(undefined)
      onClose()
    } catch {
      // L'erreur est gérée par le hook de mutation
    }
  }

  const creditTypeLabel =
    selectedCreditType === 'SPECIALE'
      ? 'Crédit Spéciale'
      : selectedCreditType === 'FIXE'
        ? 'Crédit Fixe'
        : 'Crédit Aide'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] bg-white !max-w-[1200px] max-h-[94vh] overflow-hidden border border-slate-200   to-white p-0 shadow-2xl">
        <DialogHeader className="border-b border-slate-200/80 bg-white/90 px-5 py-4 md:px-7 md:py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-2xl font-black text-[#224D62]">
                {lockCreditType && initialCreditType === 'SPECIALE'
                  ? 'Nouvelle demande de crédit spéciale'
                  : 'Nouvelle demande de crédit'}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-600">
                {lockCreditType && initialCreditType === 'SPECIALE'
                  ? 'Remplissez les informations du client, du crédit et du garant.'
                  : 'Créez une nouvelle demande de crédit spéciale, fixe ou aide.'}
              </DialogDescription>
            </div>
            <div className="hidden rounded-full border border-[#234D65]/20 bg-[#234D65]/10 px-3 py-1.5 text-xs font-semibold text-[#234D65] sm:block">
              {creditTypeLabel}
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-h-[calc(94vh-96px)] flex-col">
            <div className="space-y-5 overflow-y-auto px-5 py-5 md:px-7">
              {/* Type de crédit (masqué si verrouillé) */}
              {!lockCreditType ? (
                <Card className="border border-slate-200/80 bg-white shadow-sm">
                  <CardContent className="space-y-4 p-4 md:p-5">
                    <h3 className="text-lg font-bold text-slate-900">Type de crédit</h3>

                    <FormField
                      control={form.control}
                      name="creditType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type de crédit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-xl border-2 border-slate-200 focus:border-[#234D65] focus:ring-0">
                                <SelectValue placeholder="Sélectionnez un type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl border border-slate-200">
                              <SelectItem value="SPECIALE">Spéciale (≤7 mois)</SelectItem>
                              <SelectItem value="FIXE">Fixe (illimité)</SelectItem>
                              <SelectItem value="AIDE">Aide (≤3 mois)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === 'SPECIALE' && 'Crédit spéciale : durée maximale de 7 mois'}
                            {field.value === 'FIXE' && "Crédit fixe : durée illimitée jusqu'au remboursement complet"}
                            {field.value === 'AIDE' && 'Crédit aide : durée maximale de 3 mois'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ) : (
                <FormField
                  control={form.control}
                  name="creditType"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} type="hidden" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {/* Client */}
              <Card className="border border-slate-200/80 bg-white shadow-sm">
                <CardContent className="space-y-4 p-4 md:p-5">
                  <h3 className="text-lg font-bold text-slate-900">Client</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Rechercher un membre</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Nom, prénom ou matricule..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="h-11 rounded-xl border-2 border-slate-200 bg-white pl-10 focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                      </div>

                      {clientSearch && filteredClients.length > 0 && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          {filteredClients.map((member) => (
                            <div
                              key={member.id}
                              onClick={() => handleClientSelect(member.id)}
                              className="flex cursor-pointer items-center gap-3 border-b border-slate-100 p-3 transition-colors last:border-b-0 hover:bg-[#234D65]/5"
                            >
                              <User className="h-5 w-5 text-slate-400" />
                              <div className="flex-1">
                                <div className="font-medium text-slate-900">
                                  {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.matricule || 'Membre'}
                                </div>
                                <div className="text-sm text-slate-500">Matricule: {member.matricule}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedClientId && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                          <div>
                            <div className="font-medium text-emerald-900">
                              {[form.watch('clientFirstName'), form.watch('clientLastName')].filter(Boolean).join(' ') || 'Client'}
                            </div>
                            <div className="text-sm text-emerald-700">Client sélectionné</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input {...field} type="hidden" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Informations du crédit */}
              <Card className="border border-slate-200/80 bg-white shadow-sm">
                <CardContent className="space-y-4 p-4 md:p-5">
                  <h3 className="text-lg font-bold text-slate-900">Informations du crédit</h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                              className="h-11 rounded-xl border-2 border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!isSimpleCredit && (
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
                                value={field.value || ''}
                                className="h-11 rounded-xl border-2 border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="desiredDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date souhaitée du crédit</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                type="date"
                                className="h-11 rounded-xl border-2 border-slate-200 bg-white pl-10 focus-visible:border-[#234D65] focus-visible:ring-0"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Pour quand avez-vous besoin de ce crédit ?</FormDescription>
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
                            className="min-h-[110px] rounded-xl border-2 border-slate-200 bg-white focus-visible:border-[#234D65] focus-visible:ring-0"
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

              {/* Garant */}
              <Card className="border border-slate-200/80 bg-white shadow-sm">
                <CardContent className="space-y-4 p-4 md:p-5">
                  <h3 className="text-lg font-bold text-slate-900">Garant</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Rechercher un garant</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Nom, prénom ou matricule..."
                          value={guarantorSearch}
                          onChange={(e) => setGuarantorSearch(e.target.value)}
                          className="h-11 rounded-xl border-2 border-slate-200 bg-white pl-10 focus-visible:border-[#234D65] focus-visible:ring-0"
                        />
                      </div>

                      {guarantorSearch && filteredGuarantors.length > 0 && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                          {filteredGuarantors.map((member) => (
                            <div
                              key={member.id}
                              onClick={() => handleGuarantorSelect(member.id)}
                              className="flex cursor-pointer items-center gap-3 border-b border-slate-100 p-3 transition-colors last:border-b-0 hover:bg-[#234D65]/5"
                            >
                              <User className="h-5 w-5 text-slate-400" />
                              <div className="flex-1">
                                <div className="font-medium text-slate-900">
                                  {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.matricule || 'Membre'}
                                </div>
                                <div className="text-sm text-slate-500">Matricule: {member.matricule}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedGuarantorId && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
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
                            <FormLabel className="text-sm font-medium text-slate-900">Lien de parenté</FormLabel>
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
            </div>

            {/* Actions */}
            <div className="border-t border-slate-200/80 bg-white/95 px-5 py-8 md:px-7">
              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={create.isPending}
                  className="h-11 rounded-xl border-2 border-slate-200 px-5"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending}
                  className="h-11 rounded-xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-5 text-white hover:from-[#2c5a73] hover:to-[#234D65]"
                >
                  {create.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer la demande'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
