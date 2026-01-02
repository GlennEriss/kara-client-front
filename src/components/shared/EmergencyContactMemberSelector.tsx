'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, User, Search, CheckCircle, AlertTriangle, Users, FileText, IdCard, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAllMembers } from '@/hooks/useMembers'
import SelectApp from '@/components/forms/SelectApp'
import { RELATIONSHIP_OPTIONS } from '@/constantes/relationship-types'
import { DOCUMENT_TYPE_OPTIONS, getDocumentTypeLabel } from '@/constantes/document-types'
import { getStorageInstance } from '@/firebase/storage'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { toast } from 'sonner'
import Image from 'next/image'
import { ImageCompressionService } from '@/services/imageCompressionService'
import { getMembershipRequestById } from '@/db/membership.db'

interface EmergencyContactMemberSelectorProps {
  // Valeurs actuelles
  memberId?: string
  lastName?: string
  firstName?: string
  phone1?: string
  phone2?: string
  relationship?: string
  typeId?: string
  idNumber?: string
  documentPhotoUrl?: string
  
  // Callback pour mettre à jour les valeurs
  onUpdate: (field: string, value: any) => void
  
  // Optionnel : exclure certains membres de la recherche (ex: le membre principal du contrat)
  excludeMemberIds?: string[]
}

export default function EmergencyContactMemberSelector({
  memberId,
  lastName,
  firstName,
  phone1,
  phone2,
  relationship,
  typeId,
  idNumber,
  documentPhotoUrl,
  onUpdate,
  excludeMemberIds = [],
}: EmergencyContactMemberSelectorProps) {
  // Log des props pour déboguer
  React.useEffect(() => {
    console.log('📥 Props reçues:', {
      memberId,
      lastName,
      firstName,
      phone1,
      phone2,
      relationship,
      typeId,
      idNumber,
      documentPhotoUrl
    })
  }, [memberId, lastName, firstName, phone1, phone2, relationship, typeId, idNumber, documentPhotoUrl])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(memberId)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isLoadingDossier, setIsLoadingDossier] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  // Synchroniser selectedMemberId avec la prop memberId
  React.useEffect(() => {
    setSelectedMemberId(memberId)
  }, [memberId])
  
  // Récupérer tous les membres
  const { data: membersData } = useAllMembers({}, 1, 1000)
  const members = membersData?.data || []
  
  // Filtrer les membres selon la recherche et exclure certains IDs
  const filteredMembers = members.filter(m => {
    if (excludeMemberIds.includes(m.id || '')) return false
    if (!searchQuery) return false
    const query = searchQuery.toLowerCase()
    return (
      m.firstName?.toLowerCase().includes(query) ||
      m.lastName?.toLowerCase().includes(query) ||
      m.matricule?.toLowerCase().includes(query)
    )
  }).slice(0, 10)
  
  // Constantes pour le formatage des téléphones
  const DEFAULT_PHONE_PREFIX = '+241 '
  const PHONE_DIGITS_LIMIT = 8

  const formatPhoneValue = (value: string, allowEmpty = false) => {
    const rawTrimmed = value.replace(/\s/g, '')
    if (allowEmpty && rawTrimmed === '') {
      return ''
    }

    let digits = value.replace(/[^0-9]/g, '')

    if (digits.startsWith('241')) {
      digits = digits.slice(3)
    }

    const normalized = digits.slice(0, PHONE_DIGITS_LIMIT)
    if (!normalized) {
      return allowEmpty ? '' : DEFAULT_PHONE_PREFIX
    }

    const grouped = normalized.replace(/(\d{2})(?=\d)/g, '$1 ')
    return `${DEFAULT_PHONE_PREFIX}${grouped}`.trimEnd()
  }

  // Initialiser le téléphone si vide
  useEffect(() => {
    if (!phone1) {
      onUpdate('phone1', DEFAULT_PHONE_PREFIX)
    }
  }, [phone1, onUpdate])

  // Gérer la sélection d'un membre
  const handleMemberSelect = async (member: any) => {
    console.log('🔍 Membre sélectionné:', member)
    console.log('🔍 Membre dossier:', member.dossier)
    
    setSelectedMemberId(member.id)
    
    // Mettre à jour les informations de base du membre
    onUpdate('memberId', member.id)
    onUpdate('lastName', member.lastName || '')
    onUpdate('firstName', member.firstName || '')
    
    // Remplir les téléphones si disponibles
    if (member.contacts && member.contacts.length > 0) {
      const firstContact = member.contacts[0]
      onUpdate('phone1', formatPhoneValue(firstContact))
      
      if (member.contacts.length > 1) {
        onUpdate('phone2', formatPhoneValue(member.contacts[1], true))
      }
    } else {
      onUpdate('phone1', DEFAULT_PHONE_PREFIX)
    }
    
    // Récupérer le dossier du membre si disponible
    if (member.dossier) {
      console.log('📁 Récupération du dossier:', member.dossier)
      setIsLoadingDossier(true)
      try {
        const dossier = await getMembershipRequestById(member.dossier)
        console.log('📁 Dossier récupéré:', dossier)
        
        if (dossier && dossier.documents) {
          console.log('📄 Documents du dossier:', dossier.documents)
          
          // Remplir automatiquement les informations du document
          if (dossier.documents.documentPhotoFrontURL) {
            console.log('📷 Photo du document:', dossier.documents.documentPhotoFrontURL)
            onUpdate('documentPhotoUrl', dossier.documents.documentPhotoFrontURL)
            validateField('documentPhotoUrl', dossier.documents.documentPhotoFrontURL)
          }
          
          if (dossier.documents.identityDocument) {
            console.log('🆔 Type de document:', dossier.documents.identityDocument)
            onUpdate('typeId', dossier.documents.identityDocument)
            validateField('typeId', dossier.documents.identityDocument)
          }
          
          if (dossier.documents.identityDocumentNumber) {
            console.log('🔢 Numéro de document:', dossier.documents.identityDocumentNumber)
            onUpdate('idNumber', dossier.documents.identityDocumentNumber)
            validateField('idNumber', dossier.documents.identityDocumentNumber)
          }
          
          toast.success('Informations du document récupérées automatiquement', {
            description: 'Les informations de la pièce d\'identité ont été remplies depuis le dossier du membre.',
            duration: 3000,
          })
        } else {
          console.warn('⚠️ Dossier trouvé mais pas de documents:', dossier)
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du dossier:', error)
        toast.error('Impossible de récupérer le dossier du membre', {
          description: 'Vous pouvez saisir manuellement les informations du document.',
          duration: 4000,
        })
      } finally {
        setIsLoadingDossier(false)
      }
    } else {
      console.warn('⚠️ Le membre n\'a pas de dossier (membership-request)')
      toast.info('Le membre sélectionné n\'a pas de dossier', {
        description: 'Veuillez saisir manuellement les informations du document.',
        duration: 3000,
      })
    }
    
    setSearchQuery('')
  }

  // Gérer le changement de champ
  const handleChange = (field: string, value: string) => {
    let filteredValue = value
    
    if (field === 'phone1' || field === 'phone2') {
      filteredValue = formatPhoneValue(value, field === 'phone2')
    }
    
    onUpdate(field, filteredValue)
    validateField(field, filteredValue)
  }

  // Valider un champ
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
        
      case 'phone1': {
        const normalizedValue = value || ''
        if (!normalizedValue || normalizedValue.trim() === '') {
          newErrors.phone1 = 'Le numéro de téléphone principal est obligatoire'
        } else if (!/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(normalizedValue.replace(/\s/g, ''))) {
          newErrors.phone1 = 'Format de téléphone invalide'
        } else {
          delete newErrors.phone1
        }
        break
      }
        
      case 'phone2': {
        const normalizedValue = value || ''
        const cleaned = normalizedValue.replace(/\s/g, '')
        if (cleaned && cleaned !== '+241' && !/^(\+241|241)?(62|65|66|74|77)[0-9]{6}$/.test(normalizedValue.replace(/\s/g, ''))) {
          newErrors.phone2 = 'Format de téléphone invalide'
        } else {
          delete newErrors.phone2
        }
        break
      }
        
      case 'relationship':
        if (!value || value.trim() === '') {
          newErrors.relationship = 'Le lien de parenté est obligatoire'
        } else {
          delete newErrors.relationship
        }
        break
        
      case 'typeId':
        if (!value || value.trim() === '') {
          newErrors.typeId = 'Le type de document est obligatoire'
        } else {
          delete newErrors.typeId
        }
        break
        
      case 'idNumber':
        if (!value || value.trim() === '') {
          newErrors.idNumber = 'Le numéro de document est obligatoire'
        } else {
          delete newErrors.idNumber
        }
        break
        
      case 'documentPhotoUrl':
        if (!value || value.trim() === '') {
          newErrors.documentPhotoUrl = 'La photo du document est obligatoire'
        } else {
          delete newErrors.documentPhotoUrl
        }
        break
    }
    
    setErrors(newErrors)
  }

  // Gérer l'upload de la photo
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ImageCompressionService.isValidImageFile(file)) {
      toast.error('Le fichier doit être une image (JPG, PNG ou WEBP)')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('La taille de l\'image ne doit pas dépasser 10 MB')
      return
    }

    const originalSize = ImageCompressionService.formatFileSize(file.size)
    setIsCompressing(true)

    try {
      toast.info('Compression de l\'image en cours...', { duration: 2000 })
      const compressedFile = await ImageCompressionService.compressDocumentImage(file)
      const compressedSize = ImageCompressionService.formatFileSize(compressedFile.size)
      
      setIsCompressing(false)
      setIsUploading(true)

      toast.info('Upload de l\'image...', { duration: 2000 })
      const storage = getStorageInstance()
      const timestamp = Date.now()
      const fileName = `emergency-contact-document-${timestamp}-${file.name}`
      const filePath = `emergency-contacts/${fileName}`
      const storageRef = ref(storage, filePath)

      await uploadBytes(storageRef, compressedFile)
      const downloadURL = await getDownloadURL(storageRef)

      onUpdate('documentPhotoUrl', downloadURL)
      validateField('documentPhotoUrl', downloadURL)

      toast.success('Photo uploadée avec succès!', {
        description: `Taille réduite de ${originalSize} à ${compressedSize}`,
        duration: 4000,
      })
    } catch (error) {
      console.error('Erreur lors du traitement:', error)
      toast.error('Erreur lors de l\'upload de la photo', {
        description: error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite'
      })
    } finally {
      setIsCompressing(false)
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = () => {
    onUpdate('documentPhotoUrl', '')
    validateField('documentPhotoUrl', '')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isFormValid = lastName && lastName.trim() !== '' && 
                     phone1 && phone1.trim() !== '' && 
                     relationship && relationship.trim() !== '' &&
                     typeId && typeId.trim() !== '' &&
                     idNumber && idNumber.trim() !== '' &&
                     documentPhotoUrl && documentPhotoUrl.trim() !== '' &&
                     Object.keys(errors).length === 0

  return (
    <Card className={cn(
      "border-2 animate-in fade-in-0 slide-in-from-bottom-4 duration-700",
      isFormValid 
        ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
        : 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50'
    )}>
      <CardHeader className="pb-4">
        <CardTitle className={cn(
          "text-lg flex items-center space-x-2",
          isFormValid ? 'text-green-800' : 'text-orange-800'
        )}>
          <AlertTriangle className={cn(
            "w-5 h-5",
            isFormValid ? 'text-green-600' : 'text-orange-600'
          )} />
          <span>Contact d&apos;urgence</span>
          <Badge variant="destructive" className="text-xs">Obligatoire</Badge>
        </CardTitle>
        <p className={cn(
          "text-sm",
          isFormValid ? 'text-green-700' : 'text-orange-700'
        )}>
          Recherchez un membre ou saisissez manuellement les informations
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recherche de membre */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-orange-800">
            Rechercher un membre
            <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700">
              Optionnel
            </Badge>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Nom, prénom ou matricule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchQuery && filteredMembers.length > 0 && (
            <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleMemberSelect(member)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center gap-3"
                >
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium">{member.firstName} {member.lastName}</div>
                    <div className="text-sm text-gray-500">
                      {member.matricule && `Matricule: ${member.matricule}`}
                      {member.contacts?.[0] && ` • ${member.contacts[0]}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && filteredMembers.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">Aucun membre trouvé</p>
          )}
        </div>

        {/* Affichage du membre sélectionné */}
        {selectedMemberId && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              {isLoadingDossier ? (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle className="h-5 w-5 text-blue-600" />
              )}
              <div className="flex-1">
                <div className="font-medium text-blue-900">
                  {lastName} {firstName && firstName}
                </div>
                <div className="text-sm text-blue-700">
                  {isLoadingDossier ? 'Récupération du dossier...' : 'Membre sélectionné'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nom et Prénom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Nom du contact <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={lastName || ''}
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
                value={firstName || ''}
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
                value={phone1 || DEFAULT_PHONE_PREFIX}
                onChange={(e) => handleChange('phone1', e.target.value)}
                placeholder="+241 65 34 56 78"
                maxLength={17}
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
                value={phone2 || ''}
                onChange={(e) => handleChange('phone2', e.target.value)}
                placeholder="+241 66 78 90 12"
                maxLength={17}
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
              value={relationship || ''}
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
              Type de document <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 z-10 pointer-events-none" />
              <SelectApp
                options={DOCUMENT_TYPE_OPTIONS}
                value={typeId || ''}
                onChange={(value) => {
                  onUpdate('typeId', value)
                  validateField('typeId', value)
                }}
                placeholder="Type de pièce"
                className={cn(
                  "pl-10 border-orange-300",
                  errors.typeId && "border-red-300 bg-red-50/50"
                )}
              />
            </div>
            {errors.typeId && (
              <p className="text-red-500 text-xs">{errors.typeId}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-orange-800">
              Numéro de document <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500" />
              <Input
                value={idNumber || ''}
                onChange={(e) => {
                  onUpdate('idNumber', e.target.value)
                  validateField('idNumber', e.target.value)
                }}
                placeholder="Ex: 123456789"
                maxLength={50}
                className={cn(
                  "pl-10 border-orange-300 focus:border-orange-500 focus:ring-orange-500/20",
                  errors.idNumber && "border-red-300 focus:border-red-500 bg-red-50/50"
                )}
              />
            </div>
            {errors.idNumber && (
              <p className="text-red-500 text-xs">{errors.idNumber}</p>
            )}
          </div>
        </div>

        {/* Photo du document */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-orange-800">
            Photo du document <span className="text-red-500">*</span>
          </label>
          
          {!documentPhotoUrl ? (
            <div className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              errors.documentPhotoUrl ? "border-red-300 bg-red-50/50" : "border-orange-300 hover:border-orange-400"
            )}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading || isCompressing}
              />
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  {(isUploading || isCompressing) ? (
                    <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isCompressing}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isCompressing ? 'Compression...' : isUploading ? 'Upload en cours...' : 'Choisir une photo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG, JPEG, WEBP jusqu&apos;à 10 MB
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    ✨ Compression automatique activée
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative border-2 border-green-300 rounded-lg p-4 bg-green-50/50">
              <div className="flex items-start gap-4">
                <div className="relative w-32 h-40 flex-shrink-0 rounded-lg overflow-hidden border-2 border-green-400">
                  <Image
                    src={documentPhotoUrl}
                    alt="Document"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Photo uploadée</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleRemovePhoto}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-green-700 break-all">
                    {documentPhotoUrl.split('/').pop()?.split('?')[0] || 'document'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isCompressing}
                    className="mt-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Changer la photo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading || isCompressing}
                  />
                </div>
              </div>
            </div>
          )}
          
          {errors.documentPhotoUrl && (
            <p className="text-red-500 text-xs">{errors.documentPhotoUrl}</p>
          )}
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
              {documentPhotoUrl && (
                <p className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <strong>Photo du document:</strong> Uploadée
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

