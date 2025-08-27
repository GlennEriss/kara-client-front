'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar,
  FileText,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Plus,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MemberWithSubscription } from '@/db/member.db'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCaisseSettingsValidation } from '@/hooks/useCaisseSettingsValidation'
import React from 'react'

interface MemberCardProps {
  member: MemberWithSubscription
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
  onPreviewAdhesion: (url: string | null) => void
}

const MemberCard = ({ member, onViewSubscriptions, onViewDetails, onPreviewAdhesion }: MemberCardProps) => {
  const router = useRouter()
  const [imageError, setImageError] = useState(false)

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatDate = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy', { locale: fr })
    } catch {
      return 'Date invalide'
    }
  }

  const getSubscriptionStatus = () => {
    if (!member.lastSubscription) {
      return {
        label: 'Aucun abonnement',
        color: 'bg-gray-100 text-gray-700',
        icon: XCircle
      }
    }

    if (member.isSubscriptionValid) {
      return {
        label: 'Abonnement valide',
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle
      }
    }

    return {
      label: 'Abonnement expiré',
      color: 'bg-red-100 text-red-700',
      icon: XCircle
    }
  }

  const getMembershipTypeColor = (type: string) => {
    const colors = {
      adherant: 'bg-[#224D62] text-white',
      bienfaiteur: 'bg-[#CBB171] text-white',
      sympathisant: 'bg-green-600 text-white'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  const subscriptionStatus = getSubscriptionStatus()

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#CBB171]/50 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          {/* Première ligne : Avatar + Menu (espace réservé et protégé) */}
          <div className="flex items-center justify-between">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-[#224D62]/20 flex-shrink-0">
              {member.photoURL && !imageError ? (
                <AvatarImage
                  src={member.photoURL}
                  alt={`${member.firstName} ${member.lastName}`}
                  onError={() => setImageError(true)}
                />
              ) : (
                <AvatarFallback className="bg-[#224D62] text-white font-semibold text-sm">
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Menu actions - toujours à droite, jamais poussé */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48">
                <DropdownMenuItem onClick={() => router.push(routes.admin.membershipDetails(member.id!))}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(routes.admin.membershipSubscription(member.id))}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Voir abonnements
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPreviewAdhesion(member.lastSubscription?.adhesionPdfURL || null)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Fiche d'adhésion
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(routes.admin.paymentsHistoryDetails(member.dossier))}>
                  <FileText className="h-4 w-4 mr-2" />
                  Historique des paiements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(routes.admin.contractsHistoryDetails(member.dossier))}>
                  <FileText className="h-4 w-4 mr-2" />
                  Historique des contrats
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Deuxième ligne : Nom complet sur toute la largeur */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
              <span className="block truncate" title={`${member.firstName} ${member.lastName}`}>
                {member.firstName} {member.lastName}
              </span>
            </h3>

            {/* Matricule */}
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {member.matricule}
            </p>

            {/* Badges - layout horizontal */}
            <div className="flex flex-wrap gap-2 items-center">
              <Badge
                variant="secondary"
                className={`text-xs ${getMembershipTypeColor(member.membershipType)}`}
              >
                {MEMBERSHIP_TYPE_LABELS[member.membershipType]}
              </Badge>

              {/* Badge abonnement - toujours visible */}
              <Badge className={`text-xs ${subscriptionStatus.color}`}>
                {subscriptionStatus.label}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
        {/* Informations d'abonnement - conditionnelles et compactes */}
        {member.lastSubscription && (
          <div className="space-y-1 text-xs sm:text-sm bg-blue-50 p-2 rounded-lg">
            <div className="flex justify-between">
              <span className="text-gray-600">Expire le:</span>
              <span className="font-medium">
                {formatDate(member.lastSubscription.dateEnd)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Montant:</span>
              <span className="font-medium">
                {member.lastSubscription.montant} {member.lastSubscription.currency}
              </span>
            </div>
          </div>
        )}

        {/* Informations de contact - layout responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
          {member.contacts && member.contacts.length > 0 && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{member.contacts[0]}</span>
            </div>
          )}

          {member.email && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{member.email}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">{member.nationality}</span>
          </div>

          {member.hasCar && (
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
              <Car className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">Véhicule</span>
            </div>
          )}
        </div>

        {/* Date d'adhésion */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Membre depuis</span>
            <span>{formatDate(member.createdAt)}</span>
          </div>
        </div>

        {/* Actions rapides - layout adaptatif */}
        <div className="pt-2 space-y-2 sm:space-y-0 mt-auto">
          {/* Mobile : stack vertical */}
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(routes.admin.membershipDetails(member.id!))}
              className="w-full text-[#224D62] border-[#224D62] hover:bg-[#224D62] hover:text-white"
            >
              <User className="h-4 w-4 mr-2" />
              Voir détails
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSubscriptions(member.id)}
              className="w-full text-[#CBB171] border-[#CBB171] hover:bg-[#CBB171] hover:text-white"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Voir abonnements
            </Button>
            <CreateCaisseContractButton
              memberId={member.id}
              onCreated={() => {
                // Optionnel : rafraîchir les données si nécessaire
                toast.success('Contrat créé avec succès')
              }}
            />
          </div>

          
        </div>
      </CardContent>
    </Card>
  )
}

function CreateCaisseContractButton({ memberId, onCreated }: { memberId: string; onCreated: () => Promise<void> | void }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState(10000)
  const [months, setMonths] = React.useState(12)
  const [caisseType, setCaisseType] = React.useState<'STANDARD' | 'JOURNALIERE' | 'LIBRE'>('STANDARD')
  const [firstPaymentDate, setFirstPaymentDate] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Validation des paramètres de la Caisse Spéciale
  const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(caisseType)

  const isDaily = caisseType === 'JOURNALIERE'
  const isLibre = caisseType === 'LIBRE'

  React.useEffect(() => {
    if (isLibre && amount < 100000) {
      setAmount(100000)
    }
  }, [caisseType])

  const onCreate = async () => {
    try {
      setLoading(true)
      
      // Validation des paramètres de la Caisse Spéciale
      if (!isValid || isValidating) {
        toast.error('Les paramètres de la Caisse Spéciale ne sont pas configurés. Impossible de créer un contrat.')
        return
      }
      
      if (isLibre && amount < 100000) {
        toast.error('Pour un contrat Libre, le montant mensuel doit être au minimum 100 000 FCFA.')
        return
      }
      if (!firstPaymentDate) {
        toast.error('Veuillez sélectionner la date du premier versement.')
        return
      }
      const { subscribe } = await import('@/services/caisse/mutations')
      await subscribe({ memberId, monthlyAmount: amount, monthsPlanned: months, caisseType, firstPaymentDate })
      toast.success('Contrat créé')
      setOpen(false)
      await onCreated()
    } catch (e: any) {
      toast.error(e?.message || 'Création impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        variant="outline"
        size="sm"
        className="w-full text-[#234D65] border-[#234D65] hover:bg-[#234D65] hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Créer un contrat
      </Button>
      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau contrat Caisse Spéciale</DialogTitle>
            <DialogDescription>Définissez le montant, la durée et la caisse.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">
                {caisseType === 'STANDARD' ? 'Montant mensuel' : caisseType === 'JOURNALIERE' ? 'Objectif mensuel' : 'Montant mensuel (minimum 100 000)'}
              </label>
              <input
                type="number"
                min={isLibre ? 100000 : 100}
                step={100}
                className="border rounded p-2 w-full"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              {isDaily && (
                <div className="text-xs text-gray-500 mt-1">L'objectif est atteint par contributions quotidiennes sur le mois.</div>
              )}
              {isLibre && (
                <div className="text-xs text-gray-500 mt-1">Le total versé par mois doit être au moins 100 000 FCFA.</div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Durée (mois)</label>
              <input type="number" min={1} max={12} className="border rounded p-2 w-full" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
            </div>
            <div>
              <label className="block text-sm mb-1">Caisse</label>
              <select className="border rounded p-2 w-full" value={caisseType} onChange={(e) => setCaisseType(e.target.value as 'STANDARD' | 'JOURNALIERE' | 'LIBRE')}>
                <option value="STANDARD">Standard</option>
                <option value="JOURNALIERE">Journalière</option>
                <option value="LIBRE">Libre</option>
              </select>
              
              {/* Validation des paramètres */}
              {isValidating && (
                <div className="text-xs text-blue-600 mt-1">Vérification des paramètres...</div>
              )}
              
              {!isValidating && !isValid && validationError && (
                <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 border border-red-200 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-red-700">
                    <div className="font-medium mb-1">Paramètres manquants</div>
                    <div>{validationError}</div>
                    <div className="mt-2 text-red-600">
                      Veuillez configurer les paramètres de la Caisse Spéciale dans l'administration avant de créer un contrat.
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-3 border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => router.push(routes.admin.caisseSpecialeSettings)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Configurer les paramètres
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {!isValidating && isValid && settings && (
                <div className="flex items-start gap-2 p-3 mt-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0">✓</div>
                  <div className="text-xs text-green-700">
                    <div className="font-medium mb-1">Paramètres configurés</div>
                    <div>Version active depuis le {new Date(settings.effectiveAt?.toDate?.() || settings.effectiveAt).toLocaleDateString('fr-FR')}</div>
                    <div className="mt-2 text-green-600">
                      Vous pouvez maintenant créer un contrat avec ce type de caisse.
                    </div>
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-3 border-green-300 text-green-700 hover:bg-green-100"
                        onClick={() => router.push(routes.admin.caisseSpeciale)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Gérer les contrats
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm mb-1">Date du premier versement *</label>
              <input 
                type="date" 
                className="border rounded p-2 w-full" 
                value={firstPaymentDate} 
                onChange={(e) => setFirstPaymentDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
            <Button 
              className="bg-[#234D65] text-white" 
              onClick={onCreate} 
              disabled={loading || !isValid || isValidating}
            >
              {loading ? 'Création…' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default MemberCard