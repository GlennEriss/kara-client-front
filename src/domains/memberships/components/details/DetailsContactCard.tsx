/**
 * Carte de contact avec email et téléphones
 */

'use client'

import { Phone, Mail, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ModernCard } from './shared/ModernCard'
import { InfoField } from './shared/InfoField'
import { toast } from 'sonner'
import type { MembershipRequest } from '../../entities'

interface DetailsContactCardProps {
  request: MembershipRequest
}

export function DetailsContactCard({ request }: DetailsContactCardProps) {
  return (
    <ModernCard 
      title="Informations de contact" 
      icon={Phone} 
      iconColor="text-green-600" 
      className="bg-gradient-to-br from-green-50/30 to-green-100/20"
    >
      <div className="space-y-4" data-testid="details-contact-card">
        <InfoField
          label="Adresse email"
          value={request.identity.email || 'Non renseigné'}
          icon={Mail}
          color="text-blue-600"
          copyable={!!request.identity.email}
          data-testid="details-contact-email"
        />

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">
            Numéros de téléphone
          </label>
          <div className="space-y-2">
            {request.identity.contacts && request.identity.contacts.length > 0 ? (
              request.identity.contacts.map((contact, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 lg:p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 group hover:shadow-md transition-all duration-300"
                  data-testid="details-contact-phone"
                >
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                    <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm lg:text-base truncate">{contact}</span>
                    <Badge variant="outline" className="text-xs bg-white flex-shrink-0">
                      {index === 0 ? 'Principal' : `Sec. ${index}`}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8 p-0 flex-shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(contact)
                      toast.success('Numéro copié !', { duration: 2000 })
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-3 lg:p-4 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-gray-500 text-sm">Non renseigné</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModernCard>
  )
}
