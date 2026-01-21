/**
 * Carte d'identité avec informations personnelles
 */

'use client'

import { User, Calendar, MapPin, Heart, Building2, CarFront, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import { formatDateDetailed } from '../../utils/details'
import { getNationalityName } from '@/constantes/nationality'
import type { MembershipRequest } from '../../entities'

interface DetailsIdentityCardProps {
  request: MembershipRequest
  intermediaryInfo?: { firstName: string; lastName: string; type: 'user' | 'admin' } | null
  isLoadingIntermediary?: boolean
}

export function DetailsIdentityCard({ 
  request, 
  intermediaryInfo, 
  isLoadingIntermediary = false 
}: DetailsIdentityCardProps) {
  return (
    <ModernCard 
      title="Informations personnelles" 
      icon={User} 
      iconColor="text-blue-600" 
      className="bg-gradient-to-br from-blue-50/30 to-blue-100/20"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4" data-testid="details-identity-card">
        <InfoField label="Civilité" value={request.identity.civility} icon={User} color="text-blue-600" />
        <InfoField label="Genre" value={request.identity.gender} icon={User} color="text-blue-600" />
        <InfoField 
          label="Prénom" 
          value={request.identity.firstName} 
          icon={User} 
          color="text-blue-600"
          data-testid="details-identity-name"
        />
        <InfoField label="Nom" value={request.identity.lastName} icon={User} color="text-blue-600" />
        <InfoField 
          label="Date de naissance" 
          value={formatDateDetailed(request.identity.birthDate)} 
          icon={Calendar} 
          color="text-purple-600"
          data-testid="details-identity-birthdate"
        />
        <InfoField label="Lieu de naissance" value={request.identity.birthPlace} icon={MapPin} color="text-red-600" />
        <InfoField label="Nationalité" value={getNationalityName(request.identity.nationality)} icon={User} color="text-green-600" />
        <InfoField label="Statut matrimonial" value={request.identity.maritalStatus} icon={Heart} color="text-pink-600" />

        {request.identity.spouseFirstName && (
          <>
            <InfoField
              label="Époux/Épouse"
              value={`${request.identity.spouseFirstName} ${request.identity.spouseLastName}`}
              icon={Heart}
              color="text-pink-600"
            />
            <InfoField
              label="Téléphone époux/épouse"
              value={request.identity.spousePhone || 'Non renseigné'}
              icon={User}
              color="text-green-600"
            />
          </>
        )}
      </div>

      <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-100">
        <InfoField label="Lieu de prière" value={request.identity.prayerPlace} icon={Building2} color="text-indigo-600" />
        
        {request.identity.intermediaryCode && (
          <div className="mt-3 lg:mt-4">
            <InfoField 
              label="Parrain" 
              value={
                isLoadingIntermediary ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                    <span>Chargement...</span>
                  </div>
                ) : intermediaryInfo ? (
                  <div className="flex items-center gap-2">
                    <span>{intermediaryInfo.firstName} {intermediaryInfo.lastName}</span>
                    <Badge variant="outline" className="text-xs">
                      {intermediaryInfo.type === 'admin' ? 'Administrateur' : 'Membre'}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-gray-500">Code: {request.identity.intermediaryCode}</span>
                )
              } 
              icon={Users} 
              color="text-orange-600" 
            />
          </div>
        )}
      </div>

      <div className="mt-3 lg:mt-4">
        <div className={`inline-flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-300 ${request.identity.hasCar
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
            : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200'
          }`}>
          <CarFront className={`w-4 h-4 lg:w-5 lg:h-5 ${request.identity.hasCar ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className="font-semibold text-sm lg:text-base">
            {request.identity.hasCar ? 'Possède un véhicule' : 'Ne possède pas de véhicule'}
          </span>
        </div>
      </div>
    </ModernCard>
  )
}
