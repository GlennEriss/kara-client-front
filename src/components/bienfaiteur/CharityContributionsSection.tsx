'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListPagination } from '@/components/ui/list-pagination'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCharityContribution, useCharityContributions, useDeleteCharityContribution } from '@/hooks/bienfaiteur/useCharityContributions'
import { useCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import type { EnrichedCharityContribution } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronDown, Coins, DollarSign, Download, Eye, FileDown, FileSpreadsheet, FileText, HandHeart, Package, Plus, Search, Trash2, Users } from 'lucide-react'
import Image from 'next/image'
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner'
import AddContributionForm from './AddContributionForm'
import CharityContributionReceiptPDF from './CharityContributionReceiptPDF'
import { useDocumentViewer } from '@/components/documents/DocumentViewerProvider'

interface CharityContributionsSectionProps {
  eventId: string
}

export default function CharityContributionsSection({ eventId }: CharityContributionsSectionProps) {
  const { openDocument } = useDocumentViewer()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'money' | 'in_kind'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'canceled'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [contributionToDelete, setContributionToDelete] = useState<string | null>(null)
  const [contributionForReceipt, setContributionForReceipt] = useState<string | null>(null)
  const [proofToView, setProofToView] = useState<string | null>(null)
  const groupsPerPage = 9

  const { data: contributions, isLoading } = useCharityContributions(eventId)
  const { data: contributionForPDF } = useCharityContribution(eventId, contributionForReceipt || '')
  const { data: event } = useCharityEvent(eventId)
  const { mutate: deleteContribution, isPending: isDeleting } = useDeleteCharityContribution()

  // Log des contributions pour debug
  React.useEffect(() => {
    if (contributions) {
      console.log('📋 Liste des contributions récupérées:', contributions)
      console.log('📋 Détails des dates:', contributions.map(c => ({
        id: c.id,
        contributionDate: c.contributionDate,
        contributionDateType: typeof c.contributionDate,
        contributionDateIsDate: c.contributionDate instanceof Date,
        contributionDateHasToDate: typeof (c.contributionDate as any)?.toDate === 'function',
        paymentDate: c.payment?.date,
        paymentDateType: typeof c.payment?.date,
        createdAt: c.createdAt,
        createdAtType: typeof c.createdAt,
      })))
    }
  }, [contributions])

  // Filtrage et pagination
  const filtered = useMemo(() => {
    return contributions?.filter(contribution => {
      // Filtre par type
      if (typeFilter !== 'all' && contribution.contributionType !== typeFilter) return false

      // Filtre par statut
      if (statusFilter !== 'all' && contribution.status !== statusFilter) return false

      // Filtre par recherche (nom du contributeur / du groupe)
      if (searchQuery.trim()) {
        const searchLower = searchQuery.trim().toLowerCase()
        const nameMatch = contribution.participant?.name?.toLowerCase().includes(searchLower)
        const groupMatch = contribution.participant?.groupName?.toLowerCase().includes(searchLower)
        if (!nameMatch && !groupMatch) return false
      }

      return true
    }) || []
  }, [contributions, typeFilter, statusFilter, searchQuery])

  const paginatedContributions = filtered

  const contributorGroups = useMemo(() => {
    const map = new Map<string, {
      id: string
      name: string
      participantType?: string
      groupName?: string
      avatar?: string
      contributions: EnrichedCharityContribution[]
      totalMoney: number
      totalInKindValue: number
      confirmedCount: number
      pendingCount: number
      canceledCount: number
      lastContributionDate?: Date
    }>()

    filtered.forEach(contribution => {
      const key = contribution.participantId || contribution.participant?.name || contribution.id
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: contribution.participant?.name || 'Contributeur inconnu',
          participantType: contribution.participant?.type,
          groupName: contribution.participant?.groupName,
          avatar: contribution.participant?.photoURL,
          contributions: [],
          totalMoney: 0,
          totalInKindValue: 0,
          confirmedCount: 0,
          pendingCount: 0,
          canceledCount: 0,
          lastContributionDate: undefined
        })
      }
      const group = map.get(key)!
      group.contributions.push(contribution)
      if (contribution.contributionType === 'money' && contribution.payment?.amount) {
        group.totalMoney += contribution.payment.amount
      }
      if (contribution.contributionType === 'in_kind' && contribution.estimatedValue) {
        group.totalInKindValue += contribution.estimatedValue
      }
      if (contribution.status === 'confirmed') group.confirmedCount += 1
      if (contribution.status === 'pending') group.pendingCount += 1
      if (contribution.status === 'canceled') group.canceledCount += 1

      const referenceDate = contribution.contributionDate || contribution.payment?.date || contribution.createdAt || contribution.updatedAt
      const currentDate =
        referenceDate instanceof Date
          ? referenceDate
          : typeof (referenceDate as any)?.toDate === 'function'
            ? (referenceDate as any).toDate()
            : referenceDate
              ? new Date(referenceDate as any)
              : undefined

      if (currentDate && (!group.lastContributionDate || currentDate > group.lastContributionDate)) {
        group.lastContributionDate = currentDate
      }
    })

    return Array.from(map.values()).sort((a, b) => (b.totalMoney + b.totalInKindValue) - (a.totalMoney + a.totalInKindValue))
  }, [filtered])

  const searchLower = searchQuery.trim().toLowerCase()
  const filteredContributorGroups = useMemo(() => {
    if (!searchLower) return contributorGroups
    return contributorGroups.filter(group => group.name.toLowerCase().includes(searchLower))
  }, [contributorGroups, searchLower])

  const totalPages = Math.max(1, Math.ceil(filteredContributorGroups.length / groupsPerPage))
  const paginatedGroups = filteredContributorGroups.slice(
    (currentPage - 1) * groupsPerPage,
    currentPage * groupsPerPage
  )

  // Calcul des totaux
  const totalAmount = filtered
    .filter(c => c.contributionType === 'money' && c.payment?.amount)
    .reduce((sum, c) => sum + (c.payment?.amount || 0), 0)
  
  const cashContributions = filtered.filter(c => c.contributionType === 'money').length
  const inKindContributions = filtered.filter(c => c.contributionType === 'in_kind').length

  React.useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, statusFilter, searchQuery])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      confirmed: { variant: 'default', label: 'Confirmé' },
      pending: { variant: 'secondary', label: 'En attente' },
      canceled: { variant: 'destructive', label: 'Annulé' }
    }
    const config = variants[status] || variants.confirmed
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDateSafe = (value: unknown) => {
    if (!value) return '—'
    let date: Date | undefined

    if (value instanceof Date) {
      date = value
    } else if (typeof (value as any)?.toDate === 'function') {
      date = (value as any).toDate()
    } else {
      date = new Date(value as any)
    }

    if (!date || isNaN(date.getTime())) {
      return '—'
    }

    return format(date, 'dd/MM/yyyy', { locale: fr })
  }

  const formatDateForExport = (value?: Date) => {
    if (!value) return ''
    try {
      return format(value, 'dd/MM/yyyy', { locale: fr })
    } catch {
      return ''
    }
  }

  const formatReadableAmount = (value?: number) =>
    new Intl.NumberFormat('fr-FR')
      .format(value ?? 0)
      .replace(/\u202f/g, ' ')

  const handleExportExcel = async () => {
    if (!filteredContributorGroups.length) {
      toast.info('Aucune contribution à exporter')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const headers = [
        'Contributeur',
        'Type',
        'Nombre de contributions',
        'Total espèces (FCFA)',
        'Valeur en nature (FCFA)',
        'Total estimé (FCFA)',
        'Confirmées',
        'En attente',
        'Annulées',
        'Dernière contribution'
      ]

      const rows = filteredContributorGroups.map(group => [
        group.name,
        group.participantType === 'group' ? 'Groupe' : 'Membre',
        group.contributions.length,
        group.totalMoney,
        group.totalInKindValue,
        group.totalMoney + group.totalInKindValue,
        group.confirmedCount,
        group.pendingCount,
        group.canceledCount,
        formatDateForExport(group.lastContributionDate)
      ])

      const worksheetData = [
        [`Contributeurs - ${event?.title || 'Évènement'}`],
        [`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`],
        [],
        headers,
        ...rows
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
      worksheet['!cols'] = headers.map(() => ({ wch: 22 }))
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contributeurs')
      const filename = `contributeurs_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Exporter Excel généré')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la génération du fichier Excel')
    }
  }

  const handleExportPDF = async () => {
    if (!filteredContributorGroups.length) {
      toast.info('Aucune contribution à exporter')
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')
      doc.setFontSize(14)
      doc.text(`Contributeurs - ${event?.title || 'Évènement'}`, 14, 16)
      doc.setFontSize(10)
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })}`, 14, 22)

      const headers = [
        'Contributeur',
        'Type',
        'Contributions',
        'Espèces (FCFA)',
        'Nature (FCFA)',
        'Total (FCFA)',
        'Confirmées',
        'En attente',
        'Annulées',
        'Dernière contribution'
      ]

      const rows = filteredContributorGroups.map(group => [
        group.name,
        group.participantType === 'group' ? 'Groupe' : 'Membre',
        group.contributions.length.toString(),
        formatReadableAmount(group.totalMoney),
        formatReadableAmount(group.totalInKindValue),
        formatReadableAmount(group.totalMoney + group.totalInKindValue),
        formatReadableAmount(group.totalMoney),
        formatReadableAmount(group.totalInKindValue),
        formatReadableAmount(group.totalMoney + group.totalInKindValue),
        group.confirmedCount.toString(),
        group.pendingCount.toString(),
        group.canceledCount.toString(),
        formatDateForExport(group.lastContributionDate)
      ])

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [35, 77, 101] }
      })

      doc.save(`contributeurs_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
      toast.success('Exporter PDF généré')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleViewProof = (contributionId: string) => {
    const contribution = contributions?.find(c => c.id === contributionId)
    if (contribution?.proofUrl) {
      setProofToView(contribution.proofUrl)
    } else {
      toast.info('Aucune preuve disponible pour cette contribution')
    }
  }

  const handleGenerateReceipt = (contributionId: string) => {
    setContributionForReceipt(contributionId)
  }

  const handleDelete = (contributionId: string) => {
    setContributionToDelete(contributionId)
  }

  const confirmDelete = () => {
    if (!contributionToDelete) return

    deleteContribution(
      { eventId, contributionId: contributionToDelete },
      {
        onSuccess: () => {
          toast.success('Contribution supprimée avec succès')
          setContributionToDelete(null)
          // Réinitialiser à la page 1 si la page actuelle est vide
          if (paginatedGroups.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1)
          }
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors de la suppression de la contribution')
        }
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques compactes - alignées avec caisse imprévue */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { title: 'Total collecté', value: `${totalAmount.toLocaleString('fr-FR')} FCFA`, color: '#CBB171', icon: DollarSign },
          { title: 'Contributions espèces', value: cashContributions, color: '#234D65', icon: Coins },
          { title: 'Dons en nature', value: inKindContributions, color: '#10b981', icon: Package },
          { title: 'Contributeurs', value: contributorGroups.length, color: '#3b82f6', icon: Users },
        ].map((stat, i) => (
          <div key={i} className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div
              className="p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
            >
              <stat.icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">{stat.title}</p>
              <p className="text-sm font-black text-gray-900 tabular-nums whitespace-nowrap">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barre d'actions - design aligné avec caisse imprévue */}
      <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
                <HandHeart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-xl font-black text-transparent md:text-2xl">
                  Contributions
                </h2>
                <p className="font-medium text-gray-600">
                  {filtered.length.toLocaleString()} contribution{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher un contributeur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-white pl-10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                  <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="money">Espèces</SelectItem>
                    <SelectItem value="in_kind">En nature</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="confirmed">Confirmé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="canceled">Annulé</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 cursor-pointer rounded-xl border-2 border-emerald-300 bg-white px-4 text-emerald-700 transition-all duration-200 hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Exporter
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-700" /> Exporter Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                      <FileDown className="mr-2 h-4 w-4 text-rose-700" /> Exporter PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  onClick={() => setIsAddOpen(true)}
                  size="sm"
                  className="h-10 cursor-pointer rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] px-4 text-white shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg border border-slate-200/80" />
              ))}
            </div>
          ) : paginatedContributions.length > 0 ? (
            <>
              {/* Vue mobile en cartes */}
              <div className="divide-y md:hidden">
                {paginatedContributions.map((contribution) => {
                  const referenceDate = 
                    contribution.contributionDate || 
                    contribution.payment?.date || 
                    contribution.createdAt || 
                    contribution.updatedAt
                  const paymentMethod = contribution.payment?.mode

                  return (
                    <div key={contribution.id} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-500">{formatDateSafe(referenceDate)}</p>
                          <div className="mt-2 flex items-center gap-3">
                            {contribution.participant?.photoURL ? (
                              <img
                                src={contribution.participant.photoURL}
                                alt={contribution.participant.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                                {contribution.participant?.name?.[0] || 'C'}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold">
                                {contribution.participant?.name || 'Contributeur inconnu'}
                              </p>
                              {contribution.participant?.type === 'member' && contribution.participant?.groupName && (
                                <p className="text-xs text-gray-500">{contribution.participant.groupName}</p>
                              )}
                              {contribution.participant?.type === 'group' && (
                                <p className="text-xs text-gray-500">Groupe</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(contribution.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={contribution.contributionType === 'money' ? 'default' : 'secondary'}>
                          {contribution.contributionType === 'money' ? 'Espèces' : 'En nature'}
                        </Badge>
                        {paymentMethod && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize text-slate-500">
                            {paymentMethod.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                        {contribution.contributionType === 'money' ? (
                          <>
                            <p className="text-lg font-semibold text-[#234D65]">
                              {contribution.payment?.amount ? `${contribution.payment.amount.toLocaleString()} FCFA` : '0 FCFA'}
                            </p>
                            {contribution.notes && (
                              <p className="text-sm text-slate-600">{contribution.notes}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-800">
                              {contribution.inKindDescription || 'Description non fournie'}
                            </p>
                            {contribution.estimatedValue && (
                                <p className="text-sm text-slate-500">
                                  Valeur estimée&nbsp;: ~{contribution.estimatedValue.toLocaleString()} FCFA
                                </p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {contribution.proofUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewProof(contribution.id)}
                            className="flex-1 border-slate-200 bg-white"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preuve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReceipt(contribution.id)}
                          className="flex-1 border-slate-200 bg-white"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Reçu
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(contribution.id)}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Vue desktop en tableau */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                      <TableHead className="text-slate-700">Date</TableHead>
                      <TableHead className="text-slate-700">Contributeur</TableHead>
                      <TableHead className="text-slate-700">Type</TableHead>
                      <TableHead className="text-slate-700">Montant / Description</TableHead>
                      <TableHead className="text-slate-700">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedContributions.map((contribution) => {
                      const referenceDate = 
                        contribution.contributionDate || 
                        contribution.payment?.date || 
                        contribution.createdAt || 
                        contribution.updatedAt
                      const paymentMethod = contribution.payment?.mode
                      return (
                        <TableRow key={contribution.id} className="border-slate-100 hover:bg-slate-50/60">
                          <TableCell className="font-medium">
                            {formatDateSafe(referenceDate)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {contribution.participant?.photoURL && (
                                <img 
                                  src={contribution.participant.photoURL} 
                                  alt={contribution.participant.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {contribution.participant?.name || 'Contributeur inconnu'}
                                </div>
                                {contribution.participant?.type === 'member' && contribution.participant?.groupName && (
                                  <div className="text-xs text-gray-500">
                                    {contribution.participant.groupName}
                                  </div>
                                )}
                                {contribution.participant?.type === 'group' && (
                                  <div className="text-xs text-gray-500">
                                    Groupe
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={contribution.contributionType === 'money' ? 'default' : 'secondary'}>
                              {contribution.contributionType === 'money' ? 'Espèces' : 'En nature'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {contribution.contributionType === 'money' ? (
                              <div>
                                <div className="font-medium">
                                  {contribution.payment?.amount 
                                    ? `${contribution.payment.amount.toLocaleString()} FCFA`
                                    : '0 FCFA'
                                  }
                                </div>
                                {paymentMethod && (
                                  <div className="text-xs text-gray-500">
                                    {paymentMethod}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm">{contribution.inKindDescription || 'Description non fournie'}</div>
                                {contribution.estimatedValue && contribution.estimatedValue > 0 && (
                                  <div className="text-xs text-gray-500">
                                    ~{contribution.estimatedValue.toLocaleString()} FCFA
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(contribution.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {contribution.proofUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewProof(contribution.id)}
                                  title="Voir la preuve"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateReceipt(contribution.id)}
                                title="Télécharger le reçu"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(contribution.id)}
                                title="Supprimer"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-slate-200/80 p-4">
                  <ListPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                    onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <p className="mb-4">Aucune contribution pour le moment</p>
              <Button onClick={() => setIsAddOpen(true)} className="rounded-xl border-0 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white shadow-sm transition-all duration-200 hover:from-[#2c5a73] hover:to-[#234D65] hover:shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter la première contribution
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'ajout */}
      <AddContributionForm
        eventId={eventId}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />

      {/* Confirmation de suppression */}
      <Dialog open={!!contributionToDelete} onOpenChange={() => setContributionToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la contribution</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette contribution ? Cette action est irréversible et mettra à jour les statistiques de l'évènement et du participant.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributionToDelete(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualisation de preuve */}
      {proofToView && (
        <Dialog open={!!proofToView} onOpenChange={() => setProofToView(null)}>
          <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preuve de contribution</DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[70vh] bg-gray-100 rounded-lg overflow-hidden">
              {proofToView.endsWith('.pdf') || proofToView.includes('application/pdf') ? (
                <iframe
                  src={proofToView}
                  className="w-full h-full"
                  title="Preuve PDF"
                />
              ) : (
                <Image
                  src={proofToView}
                  alt="Preuve de contribution"
                  fill
                  className="object-contain"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProofToView(null)}>
                Fermer
              </Button>
              <Button
                onClick={() => {
                  const isPdf = proofToView.endsWith('.pdf') || proofToView.includes('application/pdf')
                  const proofContribution = contributions?.find(c => c.proofUrl === proofToView)
                  const donorName = proofContribution?.participant?.name?.trim().replace(/\s+/g, '_')
                  const filename = donorName ? `preuve_${donorName}.${isPdf ? 'pdf' : 'jpg'}` : 'preuve.pdf'
                  openDocument({ url: proofToView, filename, title: 'Preuve de contribution' })
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de génération de reçu PDF */}
      {contributionForReceipt && contributionForPDF && event && (
        <CharityContributionReceiptPDF
          isOpen={!!contributionForReceipt}
          onClose={() => setContributionForReceipt(null)}
          contribution={contributionForPDF as any}
          event={event}
        />
      )}
    </div>
  )
}
