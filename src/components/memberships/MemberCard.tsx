'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getNationalityName } from '@/constantes/nationality'
import routes from '@/constantes/routes'
import { MemberWithSubscription } from '@/db/member.db'
import { CharityStars } from '@/domains/community/charity-stars'
import { useCaisseSettingsValidation } from '@/hooks/useCaisseSettingsValidation'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
    AlertTriangle,
    Cake,
    Calendar,
    Car,
    ExternalLink,
    Eye,
    FileText,
    KeyRound,
    Mail,
    MapPin,
    MoreVertical,
    Phone,
    Plus,
    Users,
    Wallet,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface MemberCardProps {
  member: MemberWithSubscription
  onViewSubscriptions: (memberId: string) => void
  onViewDetails: (memberId: string) => void
  onPreviewAdhesion: (url: string | null) => void
  /** Appelé quand le membre n'a pas encore de PDF d'adhésion → ouvrir l'upload. */
  onUploadAdhesion?: (member: MemberWithSubscription) => void
  onGenererIdentifiant?: (memberId: string, matricule: string) => void
  /** Solde d'étoiles de charité, fourni par la liste pour éviter une requête par carte. */
  charityStars?: number
}

// Fonction utilitaire pour vérifier si c'est l'anniversaire d'un membre
const isBirthdayToday = (birthDate: string): boolean => {
  if (!birthDate) return false
  
  try {
    const today = new Date()
    const birth = new Date(birthDate)
    
    // Comparer jour et mois (ignorer l'année)
    return today.getDate() === birth.getDate() && 
           today.getMonth() === birth.getMonth()
  } catch {
    return false
  }
}

const MemberCard = ({ member, onViewSubscriptions, onViewDetails, onPreviewAdhesion, onUploadAdhesion, onGenererIdentifiant, charityStars }: MemberCardProps) => {
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
      return { label: 'Aucun abonnement', dot: 'bg-gray-400', text: 'text-gray-500' }
    }
    if (member.isSubscriptionValid) {
      return { label: 'Abonnement valide', dot: 'bg-emerald-500', text: 'text-emerald-700' }
    }
    return { label: 'Abonnement expiré', dot: 'bg-red-400', text: 'text-red-700' }
  }

  const subscriptionStatus = getSubscriptionStatus()

  return (
    <Card className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        {/* Header : avatar + nom à gauche, statut dot + menu à droite */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              {member.photoURL && !imageError ? (
                <AvatarImage
                  src={member.photoURL}
                  alt={`${member.firstName} ${member.lastName}`}
                  onError={() => setImageError(true)}
                />
              ) : (
                <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {`${member.firstName || ''} ${member.lastName || ''}`.trim() || '—'}
              </p>
              <p className="truncate text-xs text-gray-400">{member.matricule}</p>
              {/* Affiché même à zéro : l'absence d'étoile est une information,
                  pas un vide — le badge passe simplement en gris. */}
              {charityStars !== undefined && (
                <CharityStars stars={charityStars} className="mt-1" />
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-80 transition-opacity group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48">
                <DropdownMenuItem
                  onClick={() => onViewDetails(member.id!)}
                  data-testid={`view-details-dropdown-${member.id}`}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(routes.admin.membershipSubscription(member.id))}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Voir abonnements
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(routes.admin.membershipFilleuls(member.id!))}>
                  <Users className="h-4 w-4 mr-2" />
                  Liste des filleuls
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onGenererIdentifiant && (
                  <DropdownMenuItem
                    onClick={() => onGenererIdentifiant(member.id!, member.matricule)}
                    data-testid={`generer-identifiant-dropdown-${member.id}`}
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Générer identifiant
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    const url = member.lastSubscription?.adhesionPdfURL || member.adhesionPdfURL || null
                    if (url) onPreviewAdhesion(url)
                    else onUploadAdhesion?.(member)
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {member.lastSubscription?.adhesionPdfURL || member.adhesionPdfURL
                    ? "Fiche d'adhésion"
                    : "Téléverser la fiche d'adhésion"}
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
        </div>

        {/* Statut abonnement + type d'adhésion + anniversaire */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-semibold ${subscriptionStatus.text}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${subscriptionStatus.dot}`} />
            {subscriptionStatus.label}
          </span>
          <span className="text-[10px] font-medium text-gray-400">
            {MEMBERSHIP_TYPE_LABELS[member.membershipType]}
          </span>
          {isBirthdayToday(member.birthDate) && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-pink-600">
              <Cake className="h-3 w-3" /> Anniversaire
            </span>
          )}
        </div>

        {/* Stats : abonnement */}
        {member.lastSubscription && (
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Expire le</p>
              <p className="text-sm font-medium text-gray-700">{formatDate(member.lastSubscription.dateEnd)}</p>
            </div>
            {member.lastSubscription.montant != null && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Montant</p>
                <p className="font-bold text-[#234D65] tabular-nums text-sm">
                  {member.lastSubscription.montant} <span className="text-[10px] font-normal text-gray-400">{member.lastSubscription.currency || 'XOF'}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Contact */}
        <div className="space-y-1.5 text-xs text-gray-500">
          {member.contacts && member.contacts.length > 0 && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{member.contacts[0]}</span>
            </div>
          )}
          {member.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{member.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{getNationalityName(member.nationality)}</span>
          </div>
          {member.hasCar && (
            <div className="flex items-center gap-2">
              <Car className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">Véhicule</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">Membre depuis {formatDate(member.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2 border-t border-gray-100 pt-3">
          <Button
            onClick={() => onViewDetails(member.id!)}
            data-testid={`view-details-mobile-${member.id}`}
            className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Voir détails
          </Button>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSubscriptions(member.id)}
              className="h-9 flex-1 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              Abonnements
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-9 flex-1 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]"
            >
              <Link href={routes.admin.membershipDocuments(member.id!)}>
                <FileText className="h-3.5 w-3.5 mr-1" />
                Documents
              </Link>
            </Button>
          </div>
          {onGenererIdentifiant && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenererIdentifiant(member.id!, member.matricule)}
              className="w-full h-9 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
              data-testid={`generer-identifiant-button-${member.id}`}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1.5" />
              Générer identifiant
            </Button>
          )}
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
  const [caisseType, setCaisseType] = React.useState<
    | 'STANDARD'
    | 'JOURNALIERE'
    | 'LIBRE'
    | 'STANDARD_CHARITABLE'
    | 'JOURNALIERE_CHARITABLE'
    | 'LIBRE_CHARITABLE'
  >('STANDARD')
  const [firstPaymentDate, setFirstPaymentDate] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Validation des paramètres de la Caisse Spéciale
  const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(caisseType)

  const isDaily = caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'
  const isLibre = caisseType === 'LIBRE' || caisseType === 'LIBRE_CHARITABLE'

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
        <ModalContent size="sm">
          <ModalHeader
            icon={Wallet}
            title="Nouveau contrat Caisse Spéciale"
            description="Définissez le montant, la durée et la caisse."
          />
          <ModalBody className="space-y-3">
            <div>
              <label className="block text-sm mb-1">
                {caisseType === 'STANDARD' || caisseType === 'STANDARD_CHARITABLE'
                  ? 'Montant mensuel'
                  : caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'
                    ? 'Objectif mensuel'
                    : 'Montant mensuel (minimum 100 000)'}
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
              <select
                className="border rounded p-2 w-full"
                value={caisseType}
                onChange={(e) => setCaisseType(e.target.value as any)}
              >
                <option value="STANDARD">Standard</option>
                <option value="JOURNALIERE">Journalière</option>
                <option value="LIBRE">Libre</option>
                <option value="STANDARD_CHARITABLE">Standard Charitable</option>
                <option value="JOURNALIERE_CHARITABLE">Journalière Charitable</option>
                <option value="LIBRE_CHARITABLE">Libre Charitable</option>
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
          </ModalBody>
          <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Annuler</Button>
            <Button 
              className="bg-[#234D65] text-white" 
              onClick={onCreate} 
              disabled={loading || !isValid || isValidating}
            >
              {loading ? 'Création…' : 'Créer'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>
    </>
  )
}

export default MemberCard
