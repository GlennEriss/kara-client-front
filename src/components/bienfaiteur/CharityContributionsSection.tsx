'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Download, FileText, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const itemsPerPage = 10

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
  const filtered = contributions?.filter(contribution => {
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

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedContributions = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calcul des totaux
  const totalAmount = filtered
    .filter(c => c.contributionType === 'money' && c.payment?.amount)
    .reduce((sum, c) => sum + (c.payment?.amount || 0), 0)
  
  const cashContributions = filtered.filter(c => c.contributionType === 'money').length
  const inKindContributions = filtered.filter(c => c.contributionType === 'in_kind').length

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

  const handleExportCSV = () => {
    toast.info('Export CSV à implémenter')
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
          if (paginatedContributions.length === 1 && currentPage > 1) {
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total collecté</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()} FCFA</div>
            <p className="text-xs text-gray-500 mt-1">{cashContributions} contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Dons en nature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inKindContributions}</div>
            <p className="text-xs text-gray-500 mt-1">contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}</div>
            <p className="text-xs text-gray-500 mt-1">contributions au total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un contributeur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="money">Espèces</SelectItem>
                  <SelectItem value="in_kind">En nature</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="canceled">Annulé</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>

              <Button onClick={() => setIsAddOpen(true)} className="bg-[#234D65] hover:bg-[#2c5a73]">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : paginatedContributions.length > 0 ? (
            <>
              {/* Vue mobile en cartes */}
              <div className="md:hidden divide-y">
                {paginatedContributions.map((contribution) => {
                  const referenceDate = 
                    contribution.contributionDate || 
                    contribution.payment?.date || 
                    contribution.createdAt || 
                    contribution.updatedAt
                  const paymentMethod = contribution.payment?.mode

                  return (
                    <div key={contribution.id} className="p-4 space-y-4">
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
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full capitalize">
                            {paymentMethod.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                        {contribution.contributionType === 'money' ? (
                          <>
                            <p className="text-lg font-semibold text-[#234D65]">
                              {contribution.payment?.amount ? `${contribution.payment.amount.toLocaleString()} FCFA` : '0 FCFA'}
                            </p>
                            {contribution.notes && (
                              <p className="text-sm text-gray-600">{contribution.notes}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-gray-800">
                              {contribution.inKindDescription || 'Description non fournie'}
                            </p>
                            {contribution.estimatedValue && (
                              <p className="text-sm text-gray-500">
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
                            className="flex-1"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preuve
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReceipt(contribution.id)}
                          className="flex-1"
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
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Contributeur</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Montant / Description</TableHead>
                      <TableHead>Statut</TableHead>
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
                        <TableRow key={contribution.id}>
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
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-600">
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
            <div className="p-12 text-center text-gray-500">
              <p className="mb-4">Aucune contribution pour le moment</p>
              <Button onClick={() => setIsAddOpen(true)}>
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

