/**
 * Carte d'adresse de résidence
 */

'use client'

import { MapPin, FileText } from 'lucide-react'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import { formatAddress } from '../../utils/details'
import type { MembershipRequest } from '../../entities'

interface DetailsAddressCardProps {
  request: MembershipRequest
}

export function DetailsAddressCard({ request }: DetailsAddressCardProps) {
  return (
    <ModernCard 
      title="Adresse de résidence" 
      icon={MapPin} 
      iconColor="text-red-600" 
      className="bg-gradient-to-br from-red-50/30 to-red-100/20"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4" data-testid="details-address-card">
        <InfoField label="Province" value={request.address.province} icon={MapPin} color="text-red-600" />
        <InfoField label="Ville" value={request.address.city} icon={MapPin} color="text-red-600" />
        <InfoField label="Quartier" value={request.address.district} icon={MapPin} color="text-red-600" />
        <InfoField label="Arrondissement" value={request.address.arrondissement} icon={MapPin} color="text-red-600" />
      </div>

      {request.address.additionalInfo && (
        <div className="mt-3 lg:mt-4">
          <InfoField
            label="Informations complémentaires"
            value={request.address.additionalInfo}
            icon={FileText}
            color="text-gray-600"
          />
        </div>
      )}

      {/* Adresse formatée complète (optionnel, pour référence) */}
      <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-100">
        <InfoField
          label="Adresse complète"
          value={formatAddress(request.address)}
          icon={MapPin}
          color="text-red-600"
          data-testid="details-address-full"
        />
      </div>
    </ModernCard>
  )
}
