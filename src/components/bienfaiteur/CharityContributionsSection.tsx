'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, FileText, Eye, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet, FileDown, Download } from 'lucide-react'
import { useCharityContributions, useDeleteCharityContribution, useCharityContribution } from '@/hooks/bienfaiteur/useCharityContributions'
import { useCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import AddContributionForm from './AddContributionForm'
import CharityContributionReceiptPDF from './CharityContributionReceiptPDF'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import Image from 'next/image'
import type { EnrichedCharityContribution } from '@/types/types'

interface CharityContributionsSectionProps {
  eventId: string
}

export default function CharityContributionsSection({ eventId }: CharityContributionsSectionProps) {
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

      // Filtre par recherche (TODO: ajouter nom du contributeur)
      if (searchQuery) {
        // const searchLower = searchQuery.toLowerCase()
        // return contribution contient la recherche
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
      toast.success('Export Excel généré')
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
      toast.success('Export PDF généré')
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
      {/* Résumé */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-cyan-100/70 bg-gradient-to-br from-white to-cyan-50/55 shadow-[0_12px_26px_-22px_rgba(16,58,95,0.88)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total collecté</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{totalAmount.toLocaleString()} FCFA</div>
            <p className="mt-1 text-xs text-slate-500">{cashContributions} contributions</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100/70 bg-gradient-to-br from-white to-emerald-50/60 shadow-[0_12px_26px_-22px_rgba(18,89,63,0.74)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Dons en nature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{inKindContributions}</div>
            <p className="mt-1 text-xs text-slate-500">contributions</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-100/70 bg-gradient-to-br from-white to-indigo-50/60 shadow-[0_12px_26px_-22px_rgba(66,76,135,0.7)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-700">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{filtered.length}</div>
            <p className="mt-1 text-xs text-slate-500">contributions au total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card className="border-cyan-100/70 bg-white/80 shadow-[0_12px_26px_-22px_rgba(16,58,95,0.8)] backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher un contributeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 border-cyan-100 bg-white pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="h-11 w-[180px] border-cyan-100 bg-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="money">Espèces</SelectItem>
                  <SelectItem value="in_kind">En nature</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="h-11 w-[180px] border-cyan-100 bg-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="canceled">Annulé</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleExportExcel} className="h-11 border-cyan-100 bg-white">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>
              <Button variant="outline" onClick={handleExportPDF} className="h-11 border-cyan-100 bg-white">
                <FileDown className="w-4 h-4 mr-2" />
                Exporter PDF
              </Button>

              <Button onClick={() => setIsAddOpen(true)} className="h-11 bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white hover:opacity-95">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card className="overflow-hidden border-cyan-100/70 bg-white/80 shadow-[0_14px_30px_-24px_rgba(17,57,93,0.82)] backdrop-blur-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg border border-cyan-100/70" />
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

                      <div className="space-y-1 rounded-lg border border-cyan-100/70 bg-cyan-50/35 p-3">
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
                            className="flex-1 border-cyan-100 bg-white"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preuve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReceipt(contribution.id)}
                          className="flex-1 border-cyan-100 bg-white"
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
                    <TableRow className="bg-cyan-50/70 hover:bg-cyan-50/70">
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
                        <TableRow key={contribution.id} className="border-cyan-100/60 hover:bg-cyan-50/35">
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
                <div className="flex items-center justify-between border-t border-cyan-100/70 p-4">
                  <div className="text-sm text-slate-600">
                    Page {currentPage} sur {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              <p className="mb-4">Aucune contribution pour le moment</p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-gradient-to-r from-[#1f4f67] to-[#2f7895] text-white hover:opacity-95">
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
          <DialogContent className="max-w-4xl max-h-[90vh]">
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
              <Button onClick={() => window.open(proofToView, '_blank')}>
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
