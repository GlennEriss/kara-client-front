'use client'
import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { UserCircle, Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { useFormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import { User } from '@/types/types'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useSearchMembers } from '@/hooks/caisse-imprevue/useSearchMembers'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getNationalityName } from '@/constantes/nationality'
import { useDebounce } from '@/hooks/useDebounce'

export default function Step1() {
  const { form } = useFormCaisseImprevueProvider()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
  // Debounce de 500ms pour la recherche automatique
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  
  // Deriver l'utilisateur sélectionné depuis le formulaire pour persister entre les étapes
  const step1Values = form.watch('step1')
  const selectedMemberId = step1Values?.memberId

  // Callbacks mémorisés avec useCallback pour éviter les re-renders inutiles
  const handleSearchSuccess = useCallback((_data: User[]) => {
    setIsSearching(false)
  }, [])

  const handleSearchError = useCallback((_error: Error) => {
    setIsSearching(false)
  }, [])

  // Utilisation de React Query avec la valeur debouncée
  const { 
    data: searchResults, 
    isLoading, 
    isError, 
  } = useSearchMembers(debouncedSearchQuery, {
    enabled: debouncedSearchQuery.trim().length >= 3, // Recherche automatique si au moins 3 caractères
    showNotifications: false, // Désactiver les notifications automatiques pour éviter le spam
    onSuccess: handleSearchSuccess,
    onError: handleSearchError,
  })

  // Effet pour gérer l'état de recherche
  useEffect(() => {
    if (searchQuery.trim().length >= 3 && searchQuery === debouncedSearchQuery) {
      setIsSearching(false)
    } else if (searchQuery.trim().length >= 3) {
      setIsSearching(true)
    }
  }, [searchQuery, debouncedSearchQuery])

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
          {/* Champ de recherche avec indicateur de chargement */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: 2663.MK.260925 ou Nom/Prénom (min. 3 caractères)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {(isSearching || isLoading) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#224D62]" />
              )}
            </div>
            {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
              <p className="text-xs text-muted-foreground mt-1 ml-1">
                Saisissez au moins 3 caractères pour lancer la recherche
              </p>
            )}
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
          {debouncedSearchQuery.trim().length >= 3 && searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#224D62]">
                  {searchResults.length} résultat(s) trouvé(s)
                </p>
                <Badge variant="outline" className="text-xs">
                  <Search className="w-3 h-3 mr-1" />
                  Recherche automatique
                </Badge>
              </div>
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

          {/* Message si aucun résultat */}
          {debouncedSearchQuery.trim().length >= 3 && searchResults && searchResults.length === 0 && !isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Aucun membre trouvé pour &quot;{debouncedSearchQuery}&quot;. Essayez avec un autre nom, prénom ou matricule.
              </AlertDescription>
            </Alert>
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
