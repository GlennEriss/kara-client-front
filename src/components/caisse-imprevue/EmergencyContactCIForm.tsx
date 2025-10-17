'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, User, Users, AlertTriangle, CheckCircle, FileText, IdCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmergencyContactCI } from '@/types/types'
import SelectApp, { SelectOption } from '@/components/forms/SelectApp'
import { DOCUMENT_TYPE_OPTIONS, getDocumentTypeLabel } from '@/constantes/document-types'

interface EmergencyContactCIFormProps {
  emergencyContact?: EmergencyContactCI
  onUpdate: (field: string, value: any) => void
}

// Options pour les liens de parenté
const RELATIONSHIP_OPTIONS: SelectOption[] = [
  { value: 'Ami', label: 'Ami' },
  { value: 'Amie', label: 'Amie' },
  { value: 'Autre', label: 'Autre' },
  { value: 'Conjoint', label: 'Conjoint' },
  { value: 'Conjointe', label: 'Conjointe' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Cousine', label: 'Cousine' },
  { value: 'Fille', label: 'Fille' },
  { value: 'Fils', label: 'Fils' },
  { value: 'Frère', label: 'Frère' },
  { value: 'Grand-mère', label: 'Grand-mère' },
  { value: 'Grand-père', label: 'Grand-père' },
  { value: 'Mère', label: 'Mère' },
  { value: 'Neveu', label: 'Neveu' },
  { value: 'Nièce', label: 'Nièce' },
  { value: 'Oncle', label: 'Oncle' },
  { value: 'Père', label: 'Père' },
  { value: 'Sœur', label: 'Sœur' },
  { value: 'Tante', label: 'Tante' },
]

export default function EmergencyContactCIForm({ emergencyContact, onUpdate }: EmergencyContactCIFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Valeurs actuelles
  const lastName = emergencyContact?.lastName || ''
  const firstName = emergencyContact?.firstName || ''
  const phone1 = emergencyContact?.phone1 || ''
  const phone2 = emergencyContact?.phone2 || ''
  const relationship = emergencyContact?.relationship || ''
  const idNumber = emergencyContact?.idNumber || ''
  const typeId = emergencyContact?.typeId || ''

  // Fonction pour valider un champ
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors }
    
    switch (field) {
      case 'lastName':
        if (!value || value.trim() === '') {
          newErrors.lastName = 'Le nom du contact d\'urgence est obligatoire'
        } else {
          delete newErrors.lastName
        }
        break
        
      case 'phone1':
        if (!value || value.trim() === '') {
          newErrors.phone1 = 'Le numéro de téléphone principal est obligatoire'
        } else if (!/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(value.replace(/\s/g, ''))) {
          newErrors.phone1 = 'Format de téléphone invalide'
        } else {
          delete newErrors.phone1
        }
        break
        
      case 'phone2':
        if (value && !/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(value.replace(/\s/g, ''))) {
          newErrors.phone2 = 'Format de téléphone invalide'
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

  const handleChange = (field: string, value: string) => {
    let filteredValue = value
    
    if (field === 'phone1' || field === 'phone2') {
      filteredValue = value.replace(/[^0-9+\s]/g, '').slice(0, 12)
    }
    
    onUpdate(field, filteredValue)
    validateField(field, filteredValue)
  }

  const isFormValid = lastName.trim() !== '' && 
                     phone1.trim() !== '' && 
                     relationship.trim() !== '' &&
                     Object.keys(errors).length === 0

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
          <span>Contact d&apos;urgence</span>
          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
        </CardTitle>
        <p className={`text-sm ${
          isFormValid ? 'text-green-700' : 'text-orange-700'
        }`}>
          Personne à contacter en cas d&apos;urgence ou d&apos;accident
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Nom et Prénom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20",
                  errors.lastName && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.lastName && (
              <p className="text-red-500 text-xs">{errors.lastName}</p>
            )}
          </div>

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
                className="pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>

        {/* Téléphones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20",
                  errors.phone1 && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.phone1 && (
              <p className="text-red-500 text-xs">{errors.phone1}</p>
            )}
          </div>

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
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20",
                  errors.phone2 && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.phone2 && (
              <p className="text-red-500 text-xs">{errors.phone2}</p>
            )}
          </div>
        </div>

        {/* Lien de parenté */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-orange-800">
            Lien de parenté <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 z-10 pointer-events-none" />
            <SelectApp
              options={RELATIONSHIP_OPTIONS}
              value={relationship}
              onChange={(value) => handleChange('relationship', value)}
              placeholder="Sélectionner le lien de parenté"
              className={cn(
                "pl-10 border-orange-300",
                errors.relationship && "border-red-300 bg-red-50/50"
              )}
            />
          </div>
          {errors.relationship && (
            <p className="text-red-500 text-xs">{errors.relationship}</p>
          )}
        </div>

        {/* Type de document et Numéro */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Type de document
              <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700">
                Optionnel
              </Badge>
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 z-10 pointer-events-none" />
              <SelectApp
                options={DOCUMENT_TYPE_OPTIONS}
                value={typeId}
                onChange={(value) => onUpdate('typeId', value)}
                placeholder="Type de pièce"
                className="pl-10 border-orange-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Numéro de document
              <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700">
                Optionnel
              </Badge>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={idNumber}
                onChange={(e) => onUpdate('idNumber', e.target.value)}
                placeholder="Ex: 123456789"
                maxLength={50}
                className="pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20"
              />
            </div>
          </div>
        </div>

        {/* Résumé du contact */}
        {(lastName || firstName || phone1 || relationship) && (
          <div className="p-4 bg-orange-100 rounded-lg border border-orange-200 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-orange-800">Résumé du contact d&apos;urgence</span>
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
              {typeId && (
                <p><strong>Type de document:</strong> {getDocumentTypeLabel(typeId)}</p>
              )}
              {idNumber && (
                <p><strong>N° Document:</strong> {idNumber}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

