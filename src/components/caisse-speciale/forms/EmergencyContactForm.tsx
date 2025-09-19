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

// Options pour les liens de parenté
const RELATIONSHIP_OPTIONS = [
  // Liens familiaux traditionnels
  { value: 'Père', label: 'Père' },
  { value: 'Mère', label: 'Mère' },
  { value: 'Fils', label: 'Fils' },
  { value: 'Fille', label: 'Fille' },
  { value: 'Frère', label: 'Frère' },
  { value: 'Sœur', label: 'Sœur' },
  { value: 'Grand-père', label: 'Grand-père' },
  { value: 'Grand-mère', label: 'Grand-mère' },
  { value: 'Oncle', label: 'Oncle' },
  { value: 'Tante', label: 'Tante' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Cousine', label: 'Cousine' },
  { value: 'Neveu', label: 'Neveu' },
  { value: 'Nièce', label: 'Nièce' },
  { value: 'Beau-père', label: 'Beau-père' },
  { value: 'Belle-mère', label: 'Belle-mère' },
  { value: 'Beau-fils', label: 'Beau-fils' },
  { value: 'Belle-fille', label: 'Belle-fille' },
  { value: 'Beau-frère', label: 'Beau-frère' },
  { value: 'Belle-sœur', label: 'Belle-sœur' },
  { value: 'Demi-frère', label: 'Demi-frère' },
  { value: 'Demi-sœur', label: 'Demi-sœur' },
  { value: 'Petit-fils', label: 'Petit-fils' },
  { value: 'Petite-fille', label: 'Petite-fille' },
  
  // Relations spéciales
  { value: 'Époux', label: 'Époux' },
  { value: 'Épouse', label: 'Épouse' },
  { value: 'Conjoint', label: 'Conjoint' },
  { value: 'Conjointe', label: 'Conjointe' },
  { value: 'Compagnon', label: 'Compagnon' },
  { value: 'Compagne', label: 'Compagne' },
  { value: 'Fiancé', label: 'Fiancé' },
  { value: 'Fiancée', label: 'Fiancée' },
  
  // Relations non-familiales
  { value: 'Ami', label: 'Ami' },
  { value: 'Amie', label: 'Amie' },
  { value: 'Parrain', label: 'Parrain' },
  { value: 'Marraine', label: 'Marraine' },
  { value: 'Filleul', label: 'Filleul' },
  { value: 'Filleule', label: 'Filleule' },
  { value: 'Famille d\'accueil', label: 'Famille d\'accueil' },
  { value: 'Tuteur', label: 'Tuteur' },
  { value: 'Tutrice', label: 'Tutrice' },
  { value: 'Curateur', label: 'Curateur' },
  { value: 'Curatrice', label: 'Curatrice' },
  { value: 'Collègue', label: 'Collègue' },
  { value: 'Voisin', label: 'Voisin' },
  { value: 'Voisine', label: 'Voisine' },
  { value: 'Autre', label: 'Autre' }
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
        } else if (!/^(\+241|241)?[0-9]{8}$/.test(value.replace(/\s/g, ''))) {
          newErrors.phone1 = 'Format de téléphone invalide (ex: +241 62 34 56 78)'
        } else {
          delete newErrors.phone1
        }
        break
        
      case 'phone2':
        if (value && !/^(\+241|241)?[0-9]{8}$/.test(value.replace(/\s/g, ''))) {
          newErrors.phone2 = 'Format de téléphone invalide (ex: +241 62 34 56 78)'
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
    onUpdate(field, value)
    validateField(field, value)
  }

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-orange-800 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Contact d'urgence</span>
          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
        </CardTitle>
        <p className="text-sm text-orange-700">
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
                placeholder="+241 62 34 56 78"
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
