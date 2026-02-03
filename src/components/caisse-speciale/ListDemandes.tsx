'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  RefreshCw,
  Grid3X3,
  List,
  AlertCircle,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Calendar,
  RotateCcw,
  FileDown,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CaisseSpecialeDemand, CaisseSpecialeDemandStatus } from '@/types/types'
import { useCaisseSpecialeDemands, useCaisseSpecialeDemandsStats } from '@/hooks/caisse-speciale/useCaisseSpecialeDemands'
import type { CaisseSpecialeDemandFilters } from '@/types/types'
import { useMember } from '@/hooks/useMembers'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CreateDemandModal from './CreateDemandModal'
import AcceptDemandModal from './AcceptDemandModal'
import RejectDemandModal from './RejectDemandModal'
import ReopenDemandModal from './ReopenDemandModal'
import DeleteDemandModal from './DeleteDemandModal'
import StatisticsCaisseSpecialeDemandes from './StatisticsCaisseSpecialeDemandes'
import { StatusFilterBadgesCarousel } from './StatusFilterBadgesCarousel'
import { useRouter, useSearchParams } from 'next/navigation'
import routes from '@/constantes/routes'
import { useQueryClient } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { toast } from 'sonner'

type ViewMode = 'grid' | 'list'

// Composant skeleton moderne
const ModernSkeleton = ({ viewMode: _viewMode }: { viewMode: ViewMode }) => (
  <Card className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-2/3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        <Skeleton className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

// Composant pour afficher les infos du demandeur (matricule, nom, prénom)
const MemberInfo = ({ memberId }: { memberId?: string }) => {
  const { data: member, isLoading } = useMember(memberId)
  if (isLoading) return <span className="text-gray-400 animate-pulse">Chargement...</span>
  if (!member) return <span className="text-gray-400">—</span>
  return (
    <span className="text-sm">
      {member.matricule} • {member.lastName} {member.firstName}
    </span>
  )
}

// Composant pour afficher le nom complet du membre
const MemberName = ({ memberId }: { memberId?: string }) => {
  const { data: member, isLoading } = useMember(memberId)
  if (isLoading) return <span className="text-gray-400 animate-pulse">...</span>
  if (!member) return <span className="text-gray-400">Membre inconnu</span>
  return (
    <span className="font-semibold text-gray-900">
      {member.lastName} {member.firstName}
    </span>
  )
}

// Composant pour afficher le matricule du membre
const MemberMatricule = ({ memberId }: { memberId?: string }) => {
  const { data: member, isLoading } = useMember(memberId)
  if (isLoading) return <span className="text-gray-400 animate-pulse">...</span>
  if (!member) return <span className="text-gray-400">—</span>
  return (
    <span className="text-xs text-gray-500 font-mono">
      {member.matricule || '—'}
    </span>
  )
}

// Composant pour afficher les contacts du demandeur
const MemberContacts = ({ memberId }: { memberId?: string }) => {
  const { data: member, isLoading } = useMember(memberId)
  if (isLoading) return <span className="text-gray-400 animate-pulse">Chargement...</span>
  if (!member) return <span className="text-gray-400">—</span>
  
  // Récupérer le téléphone depuis contacts (tableau ou string)
  let phone: string | undefined
  if (Array.isArray(member.contacts) && member.contacts.length > 0) {
    phone = typeof member.contacts[0] === 'string' ? member.contacts[0] : String(member.contacts[0])
  } else if (typeof member.contacts === 'string') {
    phone = member.contacts
  }
  
  const email = member.email
  
  if (!phone && !email) return <span className="text-gray-400">—</span>
  
  return (
    <span className="text-sm text-gray-700">
      {phone && <span>{phone}</span>}
      {phone && email && <br />}
      {email && <span className="text-xs">{email}</span>}
    </span>
  )
}

// Composant pour afficher le contact d'urgence
const EmergencyContactDisplay = ({ demand }: { demand: CaisseSpecialeDemand }) => {
  const ec = demand.emergencyContact
  if (!ec) return <span className="text-gray-400">—</span>
  const name = [ec.lastName, ec.firstName].filter(Boolean).join(' ')
  const phone = ec.phone1
  if (!name && !phone) return <span className="text-gray-400">—</span>
  return (
    <span className="text-sm text-gray-700">
      {name || '—'}
      {phone && <><br /><span className="text-xs">{phone}</span></>}
    </span>
  )
}

// Carte de demande avec chargement des infos membre
const DemandCard = ({
  demande,
  getStatusColor,
  getStatusLabel,
  getCaisseTypeLabel,
  setAcceptModalState,
  setRejectModalState,
  setReopenModalState,
  setDeleteModalState,
}: {
  demande: CaisseSpecialeDemand
  getStatusColor: (s: CaisseSpecialeDemandStatus) => string
  getStatusLabel: (s: CaisseSpecialeDemandStatus) => string
  getCaisseTypeLabel: (t: string) => string
  setAcceptModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setRejectModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setReopenModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setDeleteModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null; memberMatricule?: string }) => void
}) => {
  const router = useRouter()
  const { data: member, isLoading: isLoadingMember } = useMember(demande.memberId)

  // Extraire les contacts
  let memberPhone: string | undefined
  if (member) {
    if (Array.isArray(member.contacts) && member.contacts.length > 0) {
      memberPhone = typeof member.contacts[0] === 'string' ? member.contacts[0] : String(member.contacts[0])
    } else if (typeof member.contacts === 'string') {
      memberPhone = member.contacts
    }
  }

  // Contact d'urgence
  const ec = demande.emergencyContact

  return (
    <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative h-full flex flex-col">
      <CardContent className="p-6 relative z-10 flex-1 flex flex-col gap-4">
        {/* Ligne 1: ID complet bien visible, non tronqué */}
        <h3 className="font-mono text-sm font-bold text-gray-900 break-all min-w-0">
          #{demande.id}
        </h3>

        {/* Ligne 2: Badges alignés horizontalement */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            {getCaisseTypeLabel(demande.caisseType)}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
            {getStatusLabel(demande.status)}
          </span>
        </div>

        {/* Nom et prénom du demandeur (groupés, espacement serré) */}
        <div className="flex flex-col gap-0.5 text-sm font-medium text-gray-900">
          {isLoadingMember ? (
            <span className="text-gray-400 animate-pulse">Chargement...</span>
          ) : (
            <>
              <span>{member?.lastName ?? '—'}</span>
              <span>{member?.firstName ?? '—'}</span>
            </>
          )}
        </div>

        {/* Ligne 5: Matricule */}
        <div className="text-sm font-mono text-gray-700">
          {member?.matricule || demande.memberId || '—'}
        </div>

        {/* Contacts demandeur */}
        <div className="text-sm">
          <span className="text-gray-500">Contacts: </span>
          {isLoadingMember ? (
            <span className="text-gray-400 animate-pulse">—</span>
          ) : memberPhone || member?.email ? (
            <span className="text-gray-700">{memberPhone}{memberPhone && member?.email ? ' • ' : ''}{member?.email ?? ''}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        {/* Contact d'urgence: nom et prénom groupés, espacement serré */}
        <div className="text-sm">
          <span className="text-gray-500">Contact d&apos;urgence: </span>
          {ec ? (
            <div className="flex flex-col gap-0.5 mt-0.5">
              <span className="font-medium text-gray-900">{ec.lastName || '—'}</span>
              <span className="font-medium text-gray-900">{ec.firstName || '—'}</span>
              {ec.phone1 && <span className="text-gray-600 text-xs">{ec.phone1}</span>}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        {/* Montant et durée */}
        <div className="text-sm">
          <span className="text-gray-500">Montant mensuel: </span>
          <span className="font-semibold text-green-600">{demande.monthlyAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Durée: </span>
          <span className="font-medium text-gray-900">{demande.monthsPlanned} mois</span>
        </div>

        {demande.desiredDate && (
          <div className="text-sm flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
            <span className="text-gray-500">Date souhaitée:</span>
            <span className="font-medium text-gray-900">
              {new Date(demande.desiredDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        )}

        {demande.decisionMadeByName && (
          <div className="text-sm">
            <span className="text-gray-500">Décision par: </span>
            <span className="font-medium text-gray-900">{demande.decisionMadeByName}</span>
          </div>
        )}

        {/* Actions alignées verticalement */}
        <div className="pt-3 border-t border-gray-100 mt-auto flex flex-col gap-2">
          {demande.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={() => setAcceptModalState({ isOpen: true, demand: demande })}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accepter
              </Button>
              <Button
                size="sm"
                onClick={() => setRejectModalState({ isOpen: true, demand: demande })}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Refuser
              </Button>
            </>
          )}
          {demande.status === 'REJECTED' && (
            <Button
              size="sm"
              onClick={() => setReopenModalState({ isOpen: true, demand: demande })}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Réouvrir
            </Button>
          )}
          {demande.status === 'APPROVED' && demande.contractId && (
            <Badge className="w-full justify-center py-2 bg-green-100 text-green-700 border border-green-300">
              <CheckCircle className="h-4 w-4 mr-1" />
              Contrat créé
            </Badge>
          )}
          <Button
            onClick={() => router.push(`/caisse-speciale/demandes/${demande.id}`)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-white cursor-pointer text-[#224D62] border border-[#224D62] hover:bg-[#224D62] hover:text-white"
          >
            <Eye className="h-4 w-4" />
            Voir détails
          </Button>
          {demande.status !== 'CONVERTED' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteModalState({ isOpen: true, demand: demande, memberMatricule: member?.matricule })}
              className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Ligne du tableau (composant pour pouvoir utiliser useMember)
const DemandTableRow = ({
  demande,
  getStatusColor,
  getStatusLabel,
  setAcceptModalState,
  setRejectModalState,
  setReopenModalState,
  setDeleteModalState,
}: {
  demande: CaisseSpecialeDemand
  getStatusColor: (s: CaisseSpecialeDemandStatus) => string
  getStatusLabel: (s: CaisseSpecialeDemandStatus) => string
  setAcceptModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setRejectModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setReopenModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null }) => void
  setDeleteModalState: (s: { isOpen: boolean; demand: CaisseSpecialeDemand | null; memberMatricule?: string }) => void
}) => {
  const router = useRouter()
  const { data: member } = useMember(demande.memberId)
  return (
    <TableRow>
      <TableCell>{member?.matricule ?? '—'}</TableCell>
      <TableCell>{member?.lastName ?? '—'}</TableCell>
      <TableCell>{member?.firstName ?? '—'}</TableCell>
      <TableCell><MemberContacts memberId={demande.memberId} /></TableCell>
      <TableCell>{demande.monthlyAmount.toLocaleString('fr-FR')} FCFA</TableCell>
      <TableCell>{demande.monthsPlanned} mois</TableCell>
      <TableCell>{demande.desiredDate ? new Date(demande.desiredDate).toLocaleDateString('fr-FR') : '—'}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(demande.status)}`}>
          {getStatusLabel(demande.status)}
        </span>
      </TableCell>
      <TableCell><EmergencyContactDisplay demand={demande} /></TableCell>
      <TableCell className="text-right space-x-2">
        {demande.status === 'PENDING' && (
          <>
            <Button size="sm" variant="default" onClick={() => setAcceptModalState({ isOpen: true, demand: demande })}>
              Accepter
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRejectModalState({ isOpen: true, demand: demande })}>
              Refuser
            </Button>
          </>
        )}
        {demande.status === 'REJECTED' && (
          <Button size="sm" variant="secondary" onClick={() => setReopenModalState({ isOpen: true, demand: demande })}>
            Réouvrir
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => router.push(`/caisse-speciale/demandes/${demande.id}`)}>
          <Eye className="h-4 w-4" />
        </Button>
        {demande.status !== 'CONVERTED' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteModalState({ isOpen: true, demand: demande, memberMatricule: member?.matricule })}
            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

// Composant principal
const ListDemandes = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'converted'>(
    (searchParams.get('tab') as any) || 'all'
  )
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [itemsPerPage] = useState(Number(searchParams.get('limit')) || 12)
  const [viewMode, setViewMode] = useState<ViewMode>((searchParams.get('view') as ViewMode) || 'grid')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [caisseTypeFilter, setCaisseTypeFilter] = useState<string>(searchParams.get('caisseType') || 'all')
  const [createdAtFrom, setCreatedAtFrom] = useState<string>(searchParams.get('createdAtFrom') || '')
  const [createdAtTo, setCreatedAtTo] = useState<string>(searchParams.get('createdAtTo') || '')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [acceptModalState, setAcceptModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [reopenModalState, setReopenModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
  }>({
    isOpen: false,
    demand: null,
  })
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    demand: CaisseSpecialeDemand | null
    memberMatricule?: string
  }>({
    isOpen: false,
    demand: null,
  })
  const [isExporting, setIsExporting] = useState(false)

  // Synchroniser l'URL avec l'état
  useEffect(() => {
    const params = new URLSearchParams()
    if (activeTab !== 'all') params.set('tab', activeTab)
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (itemsPerPage !== 12) params.set('limit', itemsPerPage.toString())
    if (viewMode !== 'grid') params.set('view', viewMode)
    
    const queryString = params.toString()
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
    
    if (window.location.search !== `?${queryString}`) {
      router.replace(newUrl, { scroll: false })
    }
  }, [activeTab, currentPage, itemsPerPage, viewMode, router])

  // Hooks pour récupérer les données
  const getStatusFilter = () => {
    return activeTab === 'all' 
      ? undefined 
      : activeTab === 'pending' 
        ? 'PENDING' 
        : activeTab === 'approved'
          ? 'APPROVED'
          : activeTab === 'rejected'
            ? 'REJECTED'
            : 'CONVERTED'
  }

  const queryFilters: CaisseSpecialeDemandFilters = {
    status: getStatusFilter(),
    page: currentPage,
    limit: itemsPerPage,
    search: debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined,
    caisseType: caisseTypeFilter !== 'all'
      ? (caisseTypeFilter as
          | 'STANDARD'
          | 'JOURNALIERE'
          | 'LIBRE'
          | 'STANDARD_CHARITABLE'
          | 'JOURNALIERE_CHARITABLE'
          | 'LIBRE_CHARITABLE')
      : undefined,
    createdAtFrom: createdAtFrom ? new Date(createdAtFrom) : undefined,
    createdAtTo: createdAtTo ? new Date(createdAtTo + 'T23:59:59') : undefined,
  }

  const activeFiltersCount = [
    debouncedSearch.trim().length >= 2,
    caisseTypeFilter !== 'all',
    !!createdAtFrom,
    !!createdAtTo,
  ].filter(Boolean).length

  const resetFilters = () => {
    setSearchQuery('')
    setCaisseTypeFilter('all')
    setCreatedAtFrom('')
    setCreatedAtTo('')
    setCurrentPage(1)
  }

  const { data, isLoading, error } = useCaisseSpecialeDemands(queryFilters)
  const demandes = data?.items ?? []
  const totalCount = data?.total ?? 0
  
  // Stats globales pour les compteurs des tabs
  const globalStatsFilters: CaisseSpecialeDemandFilters = {}
  const { data: statsData } = useCaisseSpecialeDemandsStats(globalStatsFilters)

  // Reset page when tab or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, debouncedSearch, caisseTypeFilter, createdAtFrom, createdAtTo])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemands'] })
    queryClient.invalidateQueries({ queryKey: ['caisseSpecialeDemandsStats'] })
  }

  const getStatusLabelForExport = (status: CaisseSpecialeDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
    }
    return labels[status] || status
  }

  const getCaisseTypeLabelForExport = (type: string) => {
    const labels = {
      STANDARD: 'Standard',
      JOURNALIERE: 'Journalière',
      LIBRE: 'Libre',
      STANDARD_CHARITABLE: 'Standard Charitable',
      JOURNALIERE_CHARITABLE: 'Journalière Charitable',
      LIBRE_CHARITABLE: 'Libre Charitable',
    }
    return labels[type as keyof typeof labels] || type
  }

  const exportToPDF = async () => {
    if (totalCount === 0) {
      toast.error('Aucune demande à exporter')
      return
    }
    setIsExporting(true)
    try {
      const service = ServiceFactory.getCaisseSpecialeService()
      const exportFilters: CaisseSpecialeDemandFilters = {
        ...queryFilters,
        page: 1,
        limit: 5000,
      }
      const { items: exportDemandes } = await service.getDemandsWithFilters(exportFilters)
      if (!exportDemandes || exportDemandes.length === 0) {
        toast.error('Aucune demande à exporter')
        return
      }

      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      const tabLabel = activeTab === 'all' ? 'Toutes' : activeTab === 'pending' ? 'En attente' : activeTab === 'approved' ? 'Acceptées' : activeTab === 'rejected' ? 'Refusées' : 'Converties'
      doc.setFontSize(16)
      doc.text('Liste des Demandes Caisse Spéciale', 14, 14)
      doc.setFontSize(10)
      doc.text(`Onglet: ${tabLabel}`, 14, 20)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 24)
      doc.text(`Total: ${exportDemandes.length} demande(s)`, 14, 28)

      const headers = ['ID', 'Type', 'Matricule', 'Statut', 'Montant (FCFA)', 'Durée', 'Date souhaitée', 'Contact urgence', 'Date création']
      const rows = exportDemandes.map((d) => [
        d.id,
        getCaisseTypeLabelForExport(d.caisseType),
        d.memberId || '—',
        getStatusLabelForExport(d.status),
        d.monthlyAmount.toLocaleString('fr-FR'),
        `${d.monthsPlanned} mois`,
        d.desiredDate ? new Date(d.desiredDate).toLocaleDateString('fr-FR') : '—',
        d.emergencyContact ? `${d.emergencyContact.lastName || ''} ${d.emergencyContact.firstName || ''}`.trim() || d.emergencyContact.phone1 || '—' : '—',
        d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—',
      ])

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32 },
      })

      const filename = `demandes_caisse_speciale_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(filename)
      toast.success('Export PDF généré')
    } catch (err) {
      console.error('Erreur export PDF:', err)
      toast.error('Erreur lors de l\'export PDF')
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    if (totalCount === 0) {
      toast.error('Aucune demande à exporter')
      return
    }
    setIsExporting(true)
    try {
      const service = ServiceFactory.getCaisseSpecialeService()
      const exportFilters: CaisseSpecialeDemandFilters = {
        ...queryFilters,
        page: 1,
        limit: 5000,
      }
      const { items: exportDemandes } = await service.getDemandsWithFilters(exportFilters)
      if (!exportDemandes || exportDemandes.length === 0) {
        toast.error('Aucune demande à exporter')
        return
      }

      const XLSX = await import('xlsx')
      const headers = ['ID', 'Type', 'Matricule', 'Statut', 'Montant (FCFA)', 'Durée', 'Date souhaitée', 'Contact urgence', 'Date création']
      const rows = exportDemandes.map((d) => [
        d.id,
        getCaisseTypeLabelForExport(d.caisseType),
        d.memberId || '—',
        getStatusLabelForExport(d.status),
        d.monthlyAmount.toLocaleString('fr-FR'),
        `${d.monthsPlanned} mois`,
        d.desiredDate ? new Date(d.desiredDate).toLocaleDateString('fr-FR') : '—',
        d.emergencyContact ? `${d.emergencyContact.lastName || ''} ${d.emergencyContact.firstName || ''}`.trim() || d.emergencyContact.phone1 || '—' : '—',
        d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—',
      ])

      const tabLabel = activeTab === 'all' ? 'Toutes' : activeTab === 'pending' ? 'En attente' : activeTab === 'approved' ? 'Acceptées' : activeTab === 'rejected' ? 'Refusées' : 'Converties'
      const sheetData = [
        ['LISTE DES DEMANDES CAISSE SPÉCIALE'],
        [`Onglet: ${tabLabel}`],
        [`Généré le ${new Date().toLocaleDateString('fr-FR')}`],
        [],
        headers,
        ...rows,
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
      ]
      worksheet['!cols'] = headers.map(() => ({ wch: 20 }))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Demandes')
      const filename = `demandes_caisse_speciale_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Export Excel généré')
    } catch (err) {
      console.error('Erreur export Excel:', err)
      toast.error('Erreur lors de l\'export Excel')
    } finally {
      setIsExporting(false)
    }
  }

  // Fonctions utilitaires
  const getStatusColor = (status: CaisseSpecialeDemandStatus) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      APPROVED: 'bg-green-100 text-green-700 border-green-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      CONVERTED: 'bg-blue-100 text-blue-700 border-blue-200',
    }
    return colors[status] || colors.PENDING
  }

  const getStatusLabel = (status: CaisseSpecialeDemandStatus) => {
    const labels = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
      CONVERTED: 'Convertie',
    }
    return labels[status] || status
  }

  const getCaisseTypeLabel = (type: string) => {
    const labels = {
      STANDARD: 'Standard',
      JOURNALIERE: 'Journalière',
      LIBRE: 'Libre',
      STANDARD_CHARITABLE: 'Standard Charitable',
      JOURNALIERE_CHARITABLE: 'Journalière Charitable',
      LIBRE_CHARITABLE: 'Libre Charitable',
    }
    return labels[type as keyof typeof labels] || type
  }

  // Les demandes sont déjà paginées côté serveur
  const currentDemandes = demandes
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalCount)

  // Stats
  const stats = React.useMemo(() => {
    if (statsData) {
      return {
        total: statsData.total,
        pending: statsData.pending,
        approved: statsData.approved,
        rejected: statsData.rejected,
        converted: statsData.converted,
      }
    }
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      converted: 0,
    }
  }, [statsData])

  // Gestion des erreurs
  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in-0 duration-500">
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des demandes : {error instanceof Error ? error.message : 'Erreur inconnue'}
            <Button
              variant="link"
              className="p-0 h-auto ml-2 text-red-700 underline font-bold hover:text-red-800"
              onClick={handleRefresh}
            >
              Réessayer maintenant
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Statistiques EN PREMIER (C.1) - chargées une seule fois */}
      <StatisticsCaisseSpecialeDemandes />

      {/* Filtres de statut : Tabs en desktop, badges carousel en mobile/tablette */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        {/* Tabs - Vue desktop uniquement */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Toutes ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Acceptées ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Refusées ({stats.rejected})
            </TabsTrigger>
            <TabsTrigger value="converted" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Converties ({stats.converted})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Badges carousel - Vue mobile et tablette */}
        <div className="lg:hidden">
          <StatusFilterBadgesCarousel
            value={activeTab}
            onChange={(value) => setActiveTab(value)}
            counts={{
              all: stats.total,
              pending: stats.pending,
              approved: stats.approved,
              rejected: stats.rejected,
              converted: stats.converted,
            }}
          />
        </div>
      </Tabs>

      {/* Barre de filtres (Phase 2) */}
      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Rechercher par nom, prénom ou matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs"
              />
              <Select value={caisseTypeFilter} onValueChange={(v) => { setCaisseTypeFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type de caisse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="JOURNALIERE">Journalière</SelectItem>
                  <SelectItem value="LIBRE">Libre</SelectItem>
                  <SelectItem value="STANDARD_CHARITABLE">Standard Charitable</SelectItem>
                  <SelectItem value="JOURNALIERE_CHARITABLE">Journalière Charitable</SelectItem>
                  <SelectItem value="LIBRE_CHARITABLE">Libre Charitable</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Date création début"
                value={createdAtFrom}
                onChange={(e) => setCreatedAtFrom(e.target.value)}
                className="w-[160px]"
              />
              <Input
                type="date"
                placeholder="Date création fin"
                value={createdAtTo}
                onChange={(e) => setCreatedAtTo(e.target.value)}
                className="w-[160px]"
              />
              {activeFiltersCount > 0 && (
                <>
                  <Badge variant="secondary">{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}</Badge>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Réinitialiser filtres
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Barre d'actions moderne */}
      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Liste des Demandes
                </h2>
                <p className="text-gray-600 font-medium">
                  {totalCount.toLocaleString()} demande{totalCount !== 1 ? 's' : ''} • Page {currentPage}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Boutons de vue modernes */}
              <div className="items-center bg-gray-100 rounded-xl p-1 shadow-inner hidden md:flex">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'grid'
                    ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105'
                    : 'hover:bg-white hover:shadow-md'
                    }`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grille
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={`h-10 px-4 rounded-lg transition-all duration-300 ${viewMode === 'list'
                    ? 'bg-[#234D65] hover:bg-[#2c5a73] text-white shadow-lg scale-105'
                    : 'hover:bg-white hover:shadow-md'
                    }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  Liste
                </Button>
              </div>

              {/* Actions avec animations */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                size="sm"
                onClick={() => router.push(routes.admin.caisseSpecialeNewDemand)}
                className="h-12 sm:h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Demande
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-12 sm:h-10 px-4"
                title="Exporter la liste en PDF"
                onClick={exportToPDF}
                disabled={isExporting || totalCount === 0}
              >
                <FileDown className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
                {isExporting ? 'Export...' : 'Exporter PDF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-12 sm:h-10 px-4"
                title="Exporter la liste en Excel"
                onClick={exportToExcel}
                disabled={isExporting || totalCount === 0}
              >
                <FileSpreadsheet className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
                {isExporting ? 'Export...' : 'Exporter Excel'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des demandes */}
      {isLoading ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-6'
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            <ModernSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : currentDemandes.length > 0 ? (
        <>
          {viewMode === 'list' ? (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>Contacts demandeur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Date souhaitée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Contact d&apos;urgence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDemandes.map((demande) => (
                    <DemandTableRow
                      key={demande.id}
                      demande={demande}
                      getStatusColor={getStatusColor}
                      getStatusLabel={getStatusLabel}
                      setAcceptModalState={setAcceptModalState}
                      setRejectModalState={setRejectModalState}
                      setReopenModalState={setReopenModalState}
                      setDeleteModalState={setDeleteModalState}
                    />
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {currentDemandes.map((demande) => (
              <DemandCard
                key={demande.id}
                demande={demande}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getCaisseTypeLabel={getCaisseTypeLabel}
                setAcceptModalState={setAcceptModalState}
                setRejectModalState={setRejectModalState}
                setReopenModalState={setReopenModalState}
                setDeleteModalState={setDeleteModalState}
              />
            ))}
          </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Affichage {startIndex + 1}-{endIndex} sur {totalCount} demandes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1"
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} sur {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1"
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Aucune demande trouvée
                </h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  Il n'y a pas encore de demandes enregistrées dans le système.
                </p>
              </div>
              <div className="flex justify-center">
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une demande
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de création */}
      <CreateDemandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal d'acceptation */}
      <AcceptDemandModal
        isOpen={acceptModalState.isOpen}
        onClose={() => setAcceptModalState({ isOpen: false, demand: null })}
        demand={acceptModalState.demand}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de refus */}
      <RejectDemandModal
        isOpen={rejectModalState.isOpen}
        onClose={() => setRejectModalState({ isOpen: false, demand: null })}
        demand={rejectModalState.demand}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de réouverture */}
      <ReopenDemandModal
        isOpen={reopenModalState.isOpen}
        onClose={() => setReopenModalState({ isOpen: false, demand: null })}
        demand={reopenModalState.demand}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />

      {/* Modal de suppression */}
      <DeleteDemandModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, demand: null })}
        demand={deleteModalState.demand}
        memberMatricule={deleteModalState.memberMatricule}
        onSuccess={() => {
          // Le cache React Query sera invalidé automatiquement par le hook
        }}
      />
    </div>
  )
}

export default ListDemandes
