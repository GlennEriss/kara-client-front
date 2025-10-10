'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, User, Users, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmergencyContact } from '@/schemas/emergency-contact.schema'

interface EmergencyContactFormProps {
  emergencyContact?: EmergencyContact
  onUpdate: (field: string, value: any) => void
}

// Options pour les liens de parenté (triées par ordre alphabétique)
const RELATIONSHIP_OPTIONS = [
  { value: 'Ami', label: 'Ami' },
  { value: 'Amie', label: 'Amie' },
  { value: 'Arrière-grand-mère', label: 'Arrière-grand-mère' },
  { value: 'Arrière-grand-père', label: 'Arrière-grand-père' },
  { value: 'Arrière-petite-fille', label: 'Arrière-petite-fille' },
  { value: 'Arrière-petit-fils', label: 'Arrière-petit-fils' },
  { value: 'Autre', label: 'Autre' },
  { value: 'Beau-fils', label: 'Beau-fils' },
  { value: 'Beau-frère', label: 'Beau-frère' },
  { value: 'Beau-père', label: 'Beau-père' },
  { value: 'Belle-fille', label: 'Belle-fille' },
  { value: 'Belle-mère', label: 'Belle-mère' },
  { value: 'Belle-sœur', label: 'Belle-sœur' },
  { value: 'Collègue', label: 'Collègue' },
  { value: 'Compagne', label: 'Compagne' },
  { value: 'Compagnon', label: 'Compagnon' },
  { value: 'Conjointe', label: 'Conjointe' },
  { value: 'Conjoint', label: 'Conjoint' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Cousine', label: 'Cousine' },
  { value: 'Curateur', label: 'Curateur' },
  { value: 'Curatrice', label: 'Curatrice' },
  { value: 'Demi-frère', label: 'Demi-frère' },
  { value: 'Demi-sœur', label: 'Demi-sœur' },
  { value: 'Épouse', label: 'Épouse' },
  { value: 'Époux', label: 'Époux' },
  { value: 'Famille d\'accueil', label: 'Famille d\'accueil' },
  { value: 'Fiancé', label: 'Fiancé' },
  { value: 'Fiancée', label: 'Fiancée' },
  { value: 'Fille', label: 'Fille' },
  { value: 'Filleul', label: 'Filleul' },
  { value: 'Filleule', label: 'Filleule' },
  { value: 'Frère', label: 'Frère' },
  { value: 'Grand-mère', label: 'Grand-mère' },
  { value: 'Grand-père', label: 'Grand-père' },
  { value: 'Marraine', label: 'Marraine' },
  { value: 'Mère', label: 'Mère' },
  { value: 'Neveu', label: 'Neveu' },
  { value: 'Nièce', label: 'Nièce' },
  { value: 'Oncle', label: 'Oncle' },
  { value: 'Parrain', label: 'Parrain' },
  { value: 'Petite-fille', label: 'Petite-fille' },
  { value: 'Petit-fils', label: 'Petit-fils' },
  { value: 'Père', label: 'Père' },
  { value: 'Sœur', label: 'Sœur' },
  { value: 'Tante', label: 'Tante' },
  { value: 'Tutrice', label: 'Tutrice' },
  { value: 'Tuteur', label: 'Tuteur' },
  { value: 'Voisin', label: 'Voisin' },
  { value: 'Voisine', label: 'Voisine' }
]

export default function EmergencyContactForm({ emergencyContact, onUpdate }: EmergencyContactFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Valeurs actuelles
  const lastName = emergencyContact?.lastName || ''
  const firstName = emergencyContact?.firstName || ''
  const phone1 = emergencyContact?.phone1 || ''
  const phone2 = emergencyContact?.phone2 || ''
  const relationship = emergencyContact?.relationship || ''

  // Fonction pour valider un champ
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'lastName':
        if (!value || value.trim() === '') {
          newErrors.lastName = 'Le nom du contact d\'urgence est obligatoire'
        } else if (value.length > 50) {
          newErrors.lastName = 'Le nom ne peut pas dépasser 50 caractères'
        } else if (!/^[a-zA-ZÀ-ÿ\s\-']+$/.test(value)) {
          newErrors.lastName = 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'
        } else {
          delete newErrors.lastName
        }
        break
        
      case 'firstName':
        if (value && value.length > 50) {
          newErrors.firstName = 'Le prénom ne peut pas dépasser 50 caractères'
        } else if (value && !/^[a-zA-ZÀ-ÿ\s\-']*$/.test(value)) {
          newErrors.firstName = 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'
        } else {
          delete newErrors.firstName
        }
        break
        
      case 'phone1':
        if (!value || value.trim() === '') {
          newErrors.phone1 = 'Le numéro de téléphone principal est obligatoire'
        } else if (value.length > 12) {
          newErrors.phone1 = 'Le numéro de téléphone ne peut pas dépasser 12 caractères'
        } else if (!/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(value.replace(/\s/g, ''))) {
          newErrors.phone1 = 'Format de téléphone invalide. Les numéros gabonais commencent par +241 62, 65, 66, 74 ou 77 (ex: +241 65 34 56 78)'
        } else {
          delete newErrors.phone1
        }
        break
        
      case 'phone2':
        if (value && value.length > 12) {
          newErrors.phone2 = 'Le numéro de téléphone ne peut pas dépasser 12 caractères'
        } else if (value && !/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(value.replace(/\s/g, ''))) {
          newErrors.phone2 = 'Format de téléphone invalide. Les numéros gabonais commencent par +241 62, 65, 66, 74 ou 77 (ex: +241 65 34 56 78)'
        } else {
          delete newErrors.phone2
        }
        break
        
      case 'relationship':
        if (!value || value.trim() === '') {
          newErrors.relationship = 'Le lien de parenté est obligatoire'
        } else {
          delete newErrors.relationship
        }
        break
    }
    
    setErrors(newErrors)
  }

  // Fonction pour gérer les changements
  const handleChange = (field: string, value: string) => {
    let filteredValue = value
    
    // Filtrer les caractères pour les champs téléphone
    if (field === 'phone1' || field === 'phone2') {
      // Garder seulement les chiffres, le + et les espaces
      filteredValue = value.replace(/[^0-9+\s]/g, '')
      // Limiter à 12 caractères
      filteredValue = filteredValue.slice(0, 12)
    }
    
    onUpdate(field, filteredValue)
    validateField(field, filteredValue)
  }

  // Vérifier si le formulaire est valide
  const isFormValid = lastName.trim() !== '' && 
                     phone1.trim() !== '' && 
                     relationship.trim() !== '' &&
                     Object.keys(errors).length === 0 &&
                     (!phone1 || phone1.length <= 12) &&
                     (!phone2 || phone2.length <= 12) &&
                     (!phone1 || /^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(phone1.replace(/\s/g, ''))) &&
                     (!phone2 || phone2 === '' || /^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(phone2.replace(/\s/g, '')))

  return (
    <Card className={`border-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 ${
      isFormValid 
        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
        : 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50'
    }`}>
      <CardHeader className="pb-4">
        <CardTitle className={`text-lg flex items-center space-x-2 ${
          isFormValid ? 'text-green-800' : 'text-orange-800'
        }`}>
          <AlertTriangle className={`w-5 h-5 ${
            isFormValid ? 'text-green-600' : 'text-orange-600'
          }`} />
          <span>Contact d'urgence</span>
          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
        </CardTitle>
        <p className={`text-sm ${
          isFormValid ? 'text-green-700' : 'text-orange-700'
        }`}>
          Personne à contacter en cas d'urgence ou d'accident
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Nom et Prénom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom (obligatoire) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Nom du contact <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Nom de famille"
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300",
                  errors.lastName && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.lastName && (
              <p className="text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words font-medium">
                {errors.lastName}
              </p>
            )}
          </div>

          {/* Prénom (optionnel) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Prénom du contact
              <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700">
                Optionnel
              </Badge>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Prénom (optionnel)"
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300",
                  errors.firstName && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.firstName && (
              <p className="text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words font-medium">
                {errors.firstName}
              </p>
            )}
          </div>
        </div>

        {/* Téléphones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Téléphone 1 (obligatoire) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Téléphone principal <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={phone1}
                onChange={(e) => handleChange('phone1', e.target.value)}
                placeholder="+241 65 34 56 78"
                maxLength={12}
                pattern="[0-9+\s]*"
                inputMode="tel"
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300",
                  errors.phone1 && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.phone1 && (
              <p className="text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words font-medium">
                {errors.phone1}
              </p>
            )}
          </div>

          {/* Téléphone 2 (optionnel) */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Téléphone secondaire
              <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700">
                Optionnel
              </Badge>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={phone2}
                onChange={(e) => handleChange('phone2', e.target.value)}
                placeholder="+241 66 78 90 12"
                maxLength={12}
                pattern="[0-9+\s]*"
                inputMode="tel"
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300",
                  errors.phone2 && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.phone2 && (
              <p className="text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words font-medium">
                {errors.phone2}
              </p>
            )}
          </div>
        </div>

        {/* Lien de parenté */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-orange-800">
            Lien de parenté <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 z-10" />
            <Select
              value={relationship}
              onValueChange={(value) => handleChange('relationship', value)}
            >
              <SelectTrigger className={cn(
                "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20 transition-all duration-300",
                errors.relationship && "border-red-300 focus:border-red-500 bg-red-50/50"
              )}>
                <SelectValue placeholder="Sélectionner le lien de parenté" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.relationship && (
            <p className="text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words font-medium">
              {errors.relationship}
            </p>
          )}
        </div>

        {/* Résumé du contact */}
        {(lastName || firstName || phone1 || relationship) && (
          <div className="p-4 bg-orange-100 rounded-lg border border-orange-200 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-orange-800">Résumé du contact d'urgence</span>
            </div>
            <div className="text-sm text-orange-700 space-y-1">
              {lastName && (
                <p><strong>Nom:</strong> {lastName} {firstName && `(${firstName})`}</p>
              )}
              {phone1 && (
                <p><strong>Téléphone:</strong> {phone1} {phone2 && ` / ${phone2}`}</p>
              )}
              {relationship && (
                <p><strong>Lien:</strong> {relationship}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
