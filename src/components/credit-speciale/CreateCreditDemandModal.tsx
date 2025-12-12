'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { creditDemandFormSchema, creditDemandDefaultValues, type CreditDemandFormInput } from '@/schemas/credit-speciale.schema'
import { useAuth } from '@/hooks/useAuth'
import { useCreditDemandMutations } from '@/hooks/useCreditSpeciale'
import { useAllMembers } from '@/hooks/useMembers'
import { useCheckEligibility } from '@/hooks/useCreditSpeciale'
import { toast } from 'sonner'
import { Loader2, User, Search, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import SelectApp from '@/components/forms/SelectApp'
import { RELATIONSHIP_OPTIONS } from '@/constantes/relationship-types'

interface CreateCreditDemandModalProps {
  isOpen: boolean
  onClose: () => void
  initialClientId?: string
}

export default function CreateCreditDemandModal({ 
  isOpen, 
  onClose, 
  initialClientId 
}: CreateCreditDemandModalProps) {
  const { create } = useCreditDemandMutations()
  const { data: membersData } = useAllMembers({}, 1, 1000)
  const members = membersData?.data || []
  const checkEligibility = useCheckEligibility()
  
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialClientId)
  const [selectedGuarantorId, setSelectedGuarantorId] = useState<string | undefined>()
  const [eligibilityStatus, setEligibilityStatus] = useState<{ eligible: boolean; reason?: string } | null>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  
  const { user } = useAuth()
  
  const form = useForm<CreditDemandFormInput>({
    resolver: zodResolver(creditDemandFormSchema),
    defaultValues: {
      ...creditDemandDefaultValues,
      clientId: initialClientId || '',
      creditType: 'SPECIALE',
      status: 'PENDING',
      clientContacts: [],
      guarantorIsMember: false,
    },
  })

  // Recherche de membres
  const [clientSearch, setClientSearch] = useState('')
  const [guarantorSearch, setGuarantorSearch] = useState('')
  
  const filteredClients = members.filter(m =>
    m.firstName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    m.lastName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    m.matricule.toLowerCase().includes(clientSearch.toLowerCase())
  ).slice(0, 10)
  
  const filteredGuarantors = members.filter(m =>
    m.id !== selectedClientId && (
      m.firstName.toLowerCase().includes(guarantorSearch.toLowerCase()) ||
      m.lastName.toLowerCase().includes(guarantorSearch.toLowerCase()) ||
      m.matricule.toLowerCase().includes(guarantorSearch.toLowerCase())
    )
  ).slice(0, 10)

  // Vérifier l'éligibilité quand le client ou garant change
  React.useEffect(() => {
    if (selectedClientId) {
      setIsCheckingEligibility(true)
      checkEligibility.mutate(
        { clientId: selectedClientId, guarantorId: selectedGuarantorId },
        {
          onSuccess: (result) => {
            setEligibilityStatus(result)
            setIsCheckingEligibility(false)
          },
          onError: () => {
            setIsCheckingEligibility(false)
          },
        }
      )
    }
  }, [selectedClientId, selectedGuarantorId])

  // Mettre à jour le formulaire quand un client est sélectionné
  const handleClientSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedClientId(memberId)
      form.setValue('clientId', memberId)
      form.setValue('clientFirstName', member.firstName)
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
      form.setValue('guarantorFirstName', member.firstName)
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
        createdBy: user.uid,
        guarantorIsMember: data.guarantorIsMember ?? false,
      })
      form.reset()
      setSelectedClientId(undefined)
      setSelectedGuarantorId(undefined)
      setEligibilityStatus(null)
      onClose()
    } catch (error) {
      // L'erreur est gérée par le hook de mutation
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#224D62]">
            Nouvelle demande de crédit
          </DialogTitle>
          <DialogDescription>
            Créez une nouvelle demande de crédit spéciale, fixe ou aide
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        {form.watch('creditType') === 'FIXE' && 'Crédit fixe : durée illimitée jusqu\'au remboursement complet'}
                        {form.watch('creditType') === 'AIDE' && 'Crédit aide : durée maximale de 3 mois'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 2: Client */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Client</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rechercher un membre</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nom, prénom ou matricule..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {clientSearch && filteredClients.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                        {filteredClients.map((member) => (
                          <div
                            key={member.id}
                            onClick={() => handleClientSelect(member.id)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                          >
                            <User className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">{member.firstName} {member.lastName}</div>
                              <div className="text-sm text-gray-500">Matricule: {member.matricule}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedClientId && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-green-900">
                            {form.watch('clientFirstName')} {form.watch('clientLastName')}
                          </div>
                          <div className="text-sm text-green-700">Client sélectionné</div>
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
                            value={field.value || ''}
                          />
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
                      <FormDescription>
                        Minimum 10 caractères, maximum 500 caractères
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 4: Garant (optionnel) */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold text-lg">Garant (optionnel)</h3>
                
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
                              <div className="font-medium">{member.firstName} {member.lastName}</div>
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
                            {form.watch('guarantorFirstName')} {form.watch('guarantorLastName')}
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

            {/* Section 5: Éligibilité */}
            {eligibilityStatus !== null && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {isCheckingEligibility ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Vérification de l'éligibilité...</span>
                      </>
                    ) : eligibilityStatus.eligible ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-green-900">Client éligible</div>
                          <div className="text-sm text-green-700">
                            Le client ou le garant est à jour à la caisse imprévue
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <div className="font-medium text-orange-900">Client non éligible</div>
                          <div className="text-sm text-orange-700">
                            {eligibilityStatus.reason || 'Le client et le garant ne sont pas à jour à la caisse imprévue'}
                          </div>
                          <div className="text-xs text-orange-600 mt-1">
                            Une dérogation peut être accordée par un administrateur
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={create.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={create.isPending || (eligibilityStatus !== null && !eligibilityStatus.eligible)}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la demande'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

