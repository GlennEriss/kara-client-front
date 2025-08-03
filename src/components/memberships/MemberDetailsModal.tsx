'use client'
import React from 'react'
import { Download, CheckCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DefaultLogo } from '@/components/logo/Logo'
import type { MembershipRequest } from '@/types/types'
import { MEMBERSHIP_STATUS_LABELS } from '@/types/types'

interface MemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
}

const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  request 
}) => {
  const formatDate = (date: Date | string | any) => {
    if (!date) return 'Non défini'
    
    try {
      // Gestion des différents types de dates
      let dateObj: Date
      
      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      } else if (date.toDate && typeof date.toDate === 'function') {
        // Firestore Timestamp
        dateObj = date.toDate()
      } else {
        dateObj = new Date(date)
      }
      
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(dateObj)
    } catch (error) {
      return 'Date invalide'
    }
  }

  const handleExportPDF = () => {
    // TODO: Implémenter l'export PDF
    console.log('Export PDF pour:', request.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[50vw] !max-w-[95vw] max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            Fiche d'Adhérent
          </DialogTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center space-x-1 mr-4"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </DialogHeader>

        {/* Contenu de la fiche - Style PDF */}
        <div className="bg-white p-12 rounded-lg border shadow-sm space-y-10">
          {/* En-tête avec logo */}
          <div className="flex justify-between items-start border-b pb-6">
            <div className="flex items-center space-x-4">
              <DefaultLogo size="lg" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">KARA</h2>
                <p className="text-sm text-gray-600">Association d'Assurance Mutuelle</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Fiche d'Adhérent</p>
              <p className="text-sm text-gray-600">Date: {formatDate(new Date())}</p>
              <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
                {MEMBERSHIP_STATUS_LABELS[request.status]}
              </Badge>
            </div>
          </div>

          {/* Informations personnelles */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
              Informations Personnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-8">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Civilité</label>
                  <p className="text-gray-800">{request.identity.civility}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Nom</label>
                  <p className="text-gray-800 font-medium">{request.identity.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Prénom</label>
                  <p className="text-gray-800 font-medium">{request.identity.firstName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date de naissance</label>
                  <p className="text-gray-800">{formatDate(new Date(request.identity.birthDate))}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Lieu de naissance</label>
                  <p className="text-gray-800">{request.identity.birthPlace}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Nationalité</label>
                  <p className="text-gray-800">{request.identity.nationality}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Genre</label>
                  <p className="text-gray-800">{request.identity.gender}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Situation matrimoniale</label>
                  <p className="text-gray-800">{request.identity.maritalStatus}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-800">{request.identity.email || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Téléphone</label>
                  <p className="text-gray-800">{request.identity.contacts.join(', ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Lieu de prière</label>
                  <p className="text-gray-800">{request.identity.prayerPlace}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Possède un véhicule</label>
                  <p className="text-gray-800">{request.identity.hasCar ? 'Oui' : 'Non'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
              Adresse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Province</label>
                  <p className="text-gray-800">{request.address.province}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Ville</label>
                  <p className="text-gray-800">{request.address.city}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Quartier</label>
                  <p className="text-gray-800">{request.address.district}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Arrondissement</label>
                  <p className="text-gray-800">{request.address.arrondissement}</p>
                </div>
              </div>
              {request.address.additionalInfo && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Informations complémentaires</label>
                  <p className="text-gray-800">{request.address.additionalInfo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Informations professionnelles */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
              Informations Professionnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Statut d'emploi</label>
                  <p className="text-gray-800">{request.company.isEmployed ? 'Employé' : 'Non employé'}</p>
                </div>
                {request.company.isEmployed && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Nom de l'entreprise</label>
                      <p className="text-gray-800">{request.company.companyName || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Profession</label>
                      <p className="text-gray-800">{request.company.profession || 'Non renseigné'}</p>
                    </div>
                  </>
                )}
              </div>
              {request.company.isEmployed && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Ancienneté</label>
                    <p className="text-gray-800">{request.company.seniority || 'Non renseigné'}</p>
                  </div>
                  {request.company.companyAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Adresse de l'entreprise</label>
                      <p className="text-gray-800">
                        {[
                          request.company.companyAddress.city,
                          request.company.companyAddress.province,
                          request.company.companyAddress.district
                        ].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Informations de traitement */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-3">
              Informations de Traitement
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Date de soumission</label>
                  <p className="text-gray-800">{formatDate(request.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Dernière mise à jour</label>
                  <p className="text-gray-800">{formatDate(request.updatedAt)}</p>
                </div>
              </div>
              <div className="space-y-3">
                {request.processedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date de traitement</label>
                    <p className="text-gray-800">{formatDate(request.processedAt)}</p>
                  </div>
                )}
                {request.memberNumber && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Numéro de membre</label>
                    <p className="text-gray-800 font-medium">{request.memberNumber}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section validation */}
          {request.status === 'approved' && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Demande approuvée et validée</p>
                    <p className="text-sm text-green-600">
                      Cette demande d'adhésion a été examinée et approuvée par l'administration KARA.
                    </p>
                    {request.adminComments && (
                      <p className="text-sm text-green-600 mt-1">
                        <span className="font-medium">Commentaires :</span> {request.adminComments}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberDetailsModal