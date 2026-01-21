/**
 * Carte d'informations professionnelles et entreprise
 */

'use client'

import { Briefcase, Building2, Calendar, MapPin, Users } from 'lucide-react'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import type { MembershipRequest } from '../../entities'

interface DetailsEmploymentCardProps {
  request: MembershipRequest
  intermediaryInfo?: { firstName: string; lastName: string; type: 'user' | 'admin' } | null
}

export function DetailsEmploymentCard({ request, intermediaryInfo }: DetailsEmploymentCardProps) {
  return (
    <ModernCard 
      title="Informations professionnelles" 
      icon={Briefcase} 
      iconColor="text-purple-600" 
      className="bg-gradient-to-br from-purple-50/30 to-purple-100/20"
    >
      <div className="space-y-4" data-testid="details-employment-card">
        <div className={`inline-flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-xl transition-all duration-300 ${request.company.isEmployed
            ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200'
            : 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200'
          }`}>
          <Briefcase className={`w-4 h-4 lg:w-5 lg:h-5 ${request.company.isEmployed ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className="font-semibold text-sm lg:text-base">
            {request.company.isEmployed ? 'Employé(e)' : 'Non employé(e)'}
          </span>
        </div>

        {request.company.isEmployed && (
          <div className="mt-4 lg:mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
              <InfoField
                label="Entreprise"
                value={request.company.companyName || 'Non renseigné'}
                icon={Building2}
                color="text-indigo-600"
                data-testid="details-employment-company"
              />
              <InfoField
                label="Profession"
                value={request.company.profession || 'Non renseigné'}
                icon={Briefcase}
                color="text-purple-600"
                data-testid="details-employment-profession"
              />
              <InfoField
                label="Ancienneté"
                value={request.company.seniority || 'Non renseigné'}
                icon={Calendar}
                color="text-amber-600"
              />
            </div>

            {request.company.companyAddress && (
              <div className="mt-3 lg:mt-4">
                <InfoField
                  label="Adresse de l'entreprise"
                  value={`${request.company.companyAddress.district}, ${request.company.companyAddress.city}, ${request.company.companyAddress.province}`}
                  icon={MapPin}
                  color="text-red-600"
                />
              </div>
            )}
          </div>
        )}

        {request.identity.intermediaryCode && intermediaryInfo && (
          <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-gray-100">
            <InfoField
              label="Intermédiaire/Parrain"
              value={`${intermediaryInfo.firstName} ${intermediaryInfo.lastName} (${intermediaryInfo.type === 'admin' ? 'Admin' : 'Membre'})`}
              icon={Users}
              color="text-orange-600"
              data-testid="details-employment-intermediary"
            />
          </div>
        )}
      </div>
    </ModernCard>
  )
}
