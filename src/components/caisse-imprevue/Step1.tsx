'use client'
import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserCircle, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useFormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import { User } from '@/types/types'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useSearchMembers } from '@/hooks/caisse-imprevue/useSearchMembers'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getNationalityName } from '@/constantes/nationality'

export default function Step1() {
  const { form } = useFormCaisseImprevueProvider()
  const [searchQuery, setSearchQuery] = useState('')
  const [shouldSearch, setShouldSearch] = useState(false)
  // Deriver l'utilisateur sélectionné depuis le formulaire pour persister entre les étapes
  const step1Values = form.watch('step1')
  const selectedMemberId = step1Values?.memberId

  // Callbacks mémorisés avec useCallback pour éviter les re-renders inutiles
  const handleSearchSuccess = useCallback((data: User[]) => {
    // Actions supplémentaires après succès (optionnel)
    setShouldSearch(false)
  }, [])

  const handleSearchError = useCallback((error: Error) => {
    // Actions supplémentaires après erreur (optionnel)
    setShouldSearch(false)
  }, [])

  // Utilisation de React Query avec callbacks mémorisés
  const { 
    data: searchResults, 
    isLoading, 
    isError, 
  } = useSearchMembers(searchQuery, {
    enabled: shouldSearch,
    showNotifications: true, // Notifications automatiques gérées par le hook
    onSuccess: handleSearchSuccess,
    onError: handleSearchError,
  })

  // Fonction de recherche - simple et propre
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error('Veuillez entrer un matricule, nom ou prénom')
      return
    }
    setShouldSearch(true)
  }

  // Sélectionner un membre
  const handleSelectMember = (member: User) => {
    // ✅ Définir les valeurs avec validation et sans marquer comme touched
    const setFormValue = (field: any, value: any) => {
      form.setValue(field, value, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: false
      })
    }

    setFormValue('step1.memberId', member.id)
    setFormValue('step1.memberFirstName', member.firstName)
    setFormValue('step1.memberLastName', member.lastName)
    setFormValue('step1.memberContacts', member.contacts || [])
    setFormValue('step1.memberEmail', member.email || '')
    setFormValue('step1.memberGender', member.gender || '')
    setFormValue('step1.memberBirthDate', member.birthDate || '')
    setFormValue('step1.memberNationality', member.nationality || '')
    setFormValue('step1.memberProfession', member.profession || '')
    setFormValue('step1.memberPhotoUrl', member.photoURL || '')
    
    // Construire l'adresse complète
    const address = member.address 
      ? `${member.address.district || ''} ${member.address.arrondissement || ''} ${member.address.city || ''}`.trim()
      : ''
    setFormValue('step1.memberAddress', address)
    
    toast.success(`Membre sélectionné : ${member.firstName} ${member.lastName}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#224D62]/10">
          <UserCircle className="w-6 h-6 text-[#224D62]" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[#224D62]">Sélection du membre</h3>
          <p className="text-sm text-muted-foreground">Choisissez le membre pour la demande d'aide</p>
        </div>
      </div>

      {/* Recherche du membre */}
      <Card>
        <CardHeader>
          <CardTitle>Recherche du membre</CardTitle>
          <CardDescription>
            Recherchez un membre par son nom, prénom ou matricule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Champ de recherche */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ex: 2663.MK.260925 ou Nom/Prénom"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Rechercher
            </Button>
          </div>

          {/* Affichage de l'erreur */}
          {isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Une erreur est survenue lors de la recherche. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          )}

          {/* Résultats de recherche */}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {searchResults.length} résultat(s) trouvé(s)
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((member) => (
                  <Card
                    key={member.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedMemberId === member.id
                        ? 'border-[#224D62] bg-[#224D62]/5'
                        : ''
                    }`}
                    onClick={() => handleSelectMember(member)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {member.firstName} {member.lastName}
                            </p>
                            {selectedMemberId === member.id && (
                              <CheckCircle2 className="w-5 h-5 text-[#224D62]" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Matricule: {member.matricule}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {member.email && (
                              <Badge variant="secondary" className="text-xs">
                                {member.email}
                              </Badge>
                            )}
                            {member.contacts && member.contacts.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {member.contacts[0]}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Section de sélection du membre */}
      {selectedMemberId && (
        <Card>
          <CardHeader>
            <CardTitle>Membre sélectionné</CardTitle>
            <CardDescription>
              Informations du membre pour la demande d'aide
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo du membre */}
            {step1Values?.memberPhotoUrl && (
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Image 
                    src={step1Values.memberPhotoUrl} 
                    alt={`Photo de ${step1Values.memberFirstName} ${step1Values.memberLastName}`}
                    width={120}
                    height={140}
                    className="rounded-lg border-2 border-[#224D62] object-cover shadow-md"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#224D62]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Membre KARA
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Champs du formulaire */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="step1.memberFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step1.memberLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="step1.memberGender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexe</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step1.memberBirthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de naissance</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

              <FormField
                control={form.control}
                name="step1.memberNationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationalité</FormLabel>
                    <FormControl>
                      <Input 
                        value={getNationalityName(field.value)} 
                        disabled 
                        className="bg-gray-50" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="step1.memberEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled className="bg-gray-50" type="email" />
                  </FormControl>
                  <FormDescription>
                    Email du membre pour les notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="step1.memberContacts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacts téléphoniques</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {field.value && field.value.length > 0 ? (
                        field.value.map((contact, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-sm py-1 px-3">
                              {contact}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun contact disponible</p>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Numéros de téléphone du membre à contacter
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="step1.memberAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse / Quartier</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step1.memberProfession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-gray-50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Récapitulatif visuel */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-medium">
                    Membre confirmé : {step1Values?.memberFirstName} {step1Values?.memberLastName}
                </p>
              </div>
              <p className="text-sm text-green-600 mt-1">
                  Matricule : {step1Values?.memberId}
              </p>
              {step1Values?.memberGender && (
                <p className="text-sm text-green-600">
                  Sexe : {step1Values.memberGender}
                </p>
              )}
              {step1Values?.memberBirthDate && (
                <p className="text-sm text-green-600">
                  Date de naissance : {step1Values.memberBirthDate}
                </p>
              )}
              {step1Values?.memberNationality && (
                <p className="text-sm text-green-600">
                  Nationalité : {getNationalityName(step1Values.memberNationality)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
