'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  X,
  Calendar,
  FileArchive,
  User,
  Package,
} from 'lucide-react'
import { useDocuments } from '@/hooks/documents'
import { Document, DocumentType, DocumentFormat } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PdfViewerModal from '@/components/contract/PdfViewerModal'
import { RepositoryFactory } from '@/factories/RepositoryFactory'

// Labels pour les types de documents
const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ADHESION_CS: 'Adhésion Caisse Spéciale',
  ADHESION_CI: 'Adhésion Caisse Imprévue',
  ADHESION: 'Adhésion Mutuelle',
  CANCELED_CS: 'Annulation Caisse Spéciale',
  CANCELED_CI: 'Annulation Caisse Imprévue',
  FINISHED_CS: 'Fin Caisse Spéciale',
  FINISHED_CI: 'Fin Caisse Imprévue',
  SUPPORT_CI: 'Document de demande de support Caisse Imprévue',
  EARLY_REFUND_CI: 'Document de retrait anticipé Caisse Imprévue',
  EARLY_REFUND_CS: 'Document de retrait anticipé Caisse Spéciale',
  FINAL_REFUND_CI: 'Document de remboursement final Caisse Imprévue',
  FINAL_REFUND_CS: 'Document de remboursement final Caisse Spéciale',
  CHARITY_EVENT_MEDIA: 'Média d\'évènement Bienfaiteur',
  CHARITY_CONTRIBUTION_RECEIPT: 'Reçu de contribution Bienfaiteur',
  CHARITY_EVENT_REPORT: 'Rapport d\'évènement Bienfaiteur',
  PLACEMENT_CONTRACT: 'Contrat de placement',
  PLACEMENT_COMMISSION_PROOF: 'Preuve de commission placement',
  PLACEMENT_EARLY_EXIT_QUITTANCE: 'Quittance de retrait anticipé placement',
  PLACEMENT_FINAL_QUITTANCE: 'Quittance finale placement',
  PLACEMENT_EARLY_EXIT_ADDENDUM: 'Avenant retrait anticipé placement',
  CREDIT_SPECIALE_CONTRACT: 'Contrat crédit spéciale',
  CREDIT_SPECIALE_CONTRACT_SIGNED: 'Contrat crédit spéciale signé',
  CREDIT_SPECIALE_RECEIPT: 'Reçu de paiement crédit spéciale',
  CREDIT_SPECIALE_DISCHARGE: 'Décharge crédit spéciale',
}

// Labels pour les formats
const DOCUMENT_FORMAT_LABELS: Record<DocumentFormat, string> = {
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  image: 'Image',
  text: 'Texte',
}

// Couleurs des badges par type
const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  ADHESION_CS: 'bg-green-100 text-green-700',
  ADHESION_CI: 'bg-purple-100 text-purple-700',
  ADHESION: 'bg-blue-100 text-blue-700',
  CANCELED_CS: 'bg-red-100 text-red-700',
  CANCELED_CI: 'bg-orange-100 text-orange-700',
  FINISHED_CS: 'bg-gray-100 text-gray-700',
  FINISHED_CI: 'bg-slate-100 text-slate-700',
  EARLY_REFUND_CS: 'bg-teal-100 text-teal-700',
  EARLY_REFUND_CI: 'bg-teal-100 text-teal-700',
  FINAL_REFUND_CS: 'bg-amber-100 text-amber-700',
  FINAL_REFUND_CI: 'bg-amber-100 text-amber-700',
  CHARITY_EVENT_MEDIA: 'bg-pink-100 text-pink-700',
  CHARITY_CONTRIBUTION_RECEIPT: 'bg-indigo-100 text-indigo-700',
  CHARITY_EVENT_REPORT: 'bg-cyan-100 text-cyan-700',
}

export default function ContractsHistoryPage() {
  const router = useRouter()

  // États des filtres
  const [filters, setFilters] = useState({
    type: 'all',
    format: 'all',
    searchQuery: '',
    startDate: '',
    endDate: '',
  })

  // État de pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // État pour le modal de prévisualisation
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  // États pour stocker les informations des membres
  const [memberInfos, setMemberInfos] = useState<Record<string, { firstName: string; lastName: string }>>({})
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set())

  // Préparation des filtres pour la requête (sans searchQuery car recherche côté client)
  const queryFilters = useMemo(() => {
    const f: any = {
      limit: pageSize,
      page: currentPage,
    }
    
    if (filters.type && filters.type !== 'all') f.type = filters.type
    if (filters.format && filters.format !== 'all') f.format = filters.format
    // Note: searchQuery est géré côté client pour permettre la recherche par nom de membre
    if (filters.startDate) f.startDate = new Date(filters.startDate)
    if (filters.endDate) f.endDate = new Date(filters.endDate)

    return f
  }, [filters, currentPage, pageSize])

  // Récupération des documents paginés
  const { data, isLoading, isError, error } = useDocuments(queryFilters)
  
  const documents = data?.documents || []
  const totalDocuments = data?.total || 0
  const totalPages = data?.totalPages || 0
  const hasMore = data?.hasMore || false

  // Fonction pour récupérer les informations d'un membre
  const fetchMemberInfo = useCallback(async (memberId: string) => {
    if (memberInfos[memberId] || loadingMembers.has(memberId)) return

    setLoadingMembers(prev => new Set(prev).add(memberId))

    try {
      const memberRepository = RepositoryFactory.getMemberRepository()
      const memberData = await memberRepository.getMemberById(memberId)
      
      if (memberData) {
        setMemberInfos(prev => ({
          ...prev,
          [memberId]: {
            firstName: memberData.firstName,
            lastName: memberData.lastName
          }
        }))
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du membre:', error)
    } finally {
      setLoadingMembers(prev => {
        const newSet = new Set(prev)
        newSet.delete(memberId)
        return newSet
      })
    }
  }, [memberInfos, loadingMembers])

  // Charger les informations des membres pour tous les documents
  useEffect(() => {
    if (!documents.length) return

    const uniqueMemberIds = [...new Set(documents.map((doc: Document) => doc.memberId))]
    uniqueMemberIds.forEach((memberId: string) => {
      if (memberId && !memberInfos[memberId]) {
        fetchMemberInfo(memberId)
      }
    })
  }, [documents, memberInfos, fetchMemberInfo])

  // Filtrer les documents côté client pour inclure la recherche par nom de membre
  const filteredDocuments = useMemo(() => {
    if (!filters.searchQuery) return documents

    const searchLower = filters.searchQuery.toLowerCase()
    
    return documents.filter((doc: Document) => {
      // Recherche dans les champs du document
      const matchesDocument = 
        doc.libelle?.toLowerCase().includes(searchLower) ||
        doc.id?.toLowerCase().includes(searchLower) ||
        doc.memberId?.toLowerCase().includes(searchLower)

      // Recherche dans le nom du membre
      const memberInfo = memberInfos[doc.memberId]
      const matchesMember = memberInfo && (
        memberInfo.firstName?.toLowerCase().includes(searchLower) ||
        memberInfo.lastName?.toLowerCase().includes(searchLower) ||
        `${memberInfo.firstName} ${memberInfo.lastName}`.toLowerCase().includes(searchLower)
      )

      return matchesDocument || matchesMember
    })
  }, [documents, filters.searchQuery, memberInfos])

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      type: 'all',
      format: 'all',
      searchQuery: '',
      startDate: '',
      endDate: '',
    })
    setCurrentPage(1)
  }

  // Réinitialiser la page lors du changement de filtres
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.type, filters.format, filters.startDate, filters.endDate])

  // Fonction pour formater la taille du fichier
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Fonction pour ouvrir la prévisualisation
  const handlePreview = (document: Document) => {
    setSelectedDocument(document)
    setShowPreviewModal(true)
  }

  // Fonction pour télécharger un document
  const handleDownload = (document: Document) => {
    window.open(document.url, '_blank')
  }

  // Export Excel
  const handleExportExcel = () => {
    const exportData = filteredDocuments.map((doc: Document) => {
      const memberInfo = memberInfos[doc.memberId]
      const memberName = memberInfo 
        ? `${memberInfo.firstName} ${memberInfo.lastName}` 
        : doc.memberId

      return {
        'ID': doc.id,
        'Type': DOCUMENT_TYPE_LABELS[doc.type],
        'Format': DOCUMENT_FORMAT_LABELS[doc.format],
        'Libellé': doc.libelle,
        'Taille': formatFileSize(doc.size),
        'Membre': memberName,
        'Contrat ID': doc.contractId || 'N/A',
        'Date de création': format(doc.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr }),
        'Créé par': doc.createdBy,
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contrats')

    const fileName = `Historique_Contrats_${format(new Date(), 'ddMMyyyy')}.xlsx`
    XLSX.writeFile(workbook, fileName)
  }

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4')

    // En-tête
    doc.setFontSize(18)
    doc.setTextColor(34, 77, 98)
    doc.text('Historique des Contrats', 14, 15)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Exporté le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, 14, 22)
    doc.text(`Total: ${filteredDocuments.length} document(s)`, 14, 27)

    // Table des documents
    const tableData = filteredDocuments.map((document: Document) => {
      const memberInfo = memberInfos[document.memberId]
      const memberName = memberInfo 
        ? `${memberInfo.firstName} ${memberInfo.lastName}` 
        : document.memberId.substring(0, 15)

      return [
        document.id?.substring(0, 20) || 'N/A',
        DOCUMENT_TYPE_LABELS[document.type],
        DOCUMENT_FORMAT_LABELS[document.format],
        document.libelle.substring(0, 30),
        formatFileSize(document.size),
        memberName.substring(0, 20),
        format(document.createdAt, 'dd/MM/yyyy', { locale: fr }),
      ]
    })

    autoTable(doc, {
      startY: 32,
      head: [['ID', 'Type', 'Format', 'Libellé', 'Taille', 'Membre', 'Date']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [34, 77, 98],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 45 },
        2: { cellWidth: 20 },
        3: { cellWidth: 50 },
        4: { cellWidth: 20 },
        5: { cellWidth: 35 },
        6: { cellWidth: 25 },
      },
    })

    const fileName = `Historique_Contrats_${format(new Date(), 'ddMMyyyy')}.pdf`
    doc.save(fileName)
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement des documents: {error instanceof Error ? error.message : 'Erreur inconnue'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-[#234D65]" />
            Historique des Contrats
          </h1>
          <p className="text-gray-600 mt-2">
            Centralisation de tous les contrats PDF des différents modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={filteredDocuments.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={filteredDocuments.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-lg text-gray-900">
                  {filters.searchQuery ? filteredDocuments.length : totalDocuments}
                </p>
                {filters.searchQuery && (
                  <p className="text-xs text-gray-400">sur {totalDocuments}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caisse Imprévue</p>
                <p className="font-bold text-lg text-gray-900">
                  {filteredDocuments.filter((d: Document) => d.type.includes('CI')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Caisse Spéciale</p>
                <p className="font-bold text-lg text-gray-900">
                  {filteredDocuments.filter((d: Document) => d.type.includes('CS')).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Adhésions</p>
                <p className="font-bold text-lg text-gray-900">
                  {filteredDocuments.filter((d: Document) => d.type === 'ADHESION').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Type de document */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Format</label>
              <Select
                value={filters.format}
                onValueChange={(value) => setFilters(prev => ({ ...prev, format: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les formats</SelectItem>
                  {Object.entries(DOCUMENT_FORMAT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date de début */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date début</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            {/* Date de fin */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date fin</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            {/* Recherche */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ID, membre..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Bouton de réinitialisation */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des documents */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun document trouvé</p>
              <p className="text-sm text-gray-400 mt-2">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taille
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((document: Document) => (
                    <tr key={document.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {document.libelle}
                            </p>
                            <p className="text-xs text-gray-500">
                              {document.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={DOCUMENT_TYPE_COLORS[document.type] || 'bg-gray-100 text-gray-700'}>
                          {DOCUMENT_TYPE_LABELS[document.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline">
                          {DOCUMENT_FORMAT_LABELS[document.format]}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-50 rounded-lg">
                            <User className="h-3.5 w-3.5 text-orange-600" />
                          </div>
                          <div>
                            {memberInfos[document.memberId] ? (
                              <p className="text-sm font-medium text-gray-900">
                                {memberInfos[document.memberId].firstName} {memberInfos[document.memberId].lastName}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400">
                                {loadingMembers.has(document.memberId) ? 'Chargement...' : document.memberId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatFileSize(document.size)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {format(document.createdAt, 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {document.format === 'pdf' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePreview(document)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Voir
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(document)}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Télécharger
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filteredDocuments.length > 0 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-600">
                Affichage de {((currentPage - 1) * pageSize) + 1} à {Math.min(currentPage * pageSize, totalDocuments)} sur {totalDocuments} documents
                {filters.searchQuery && ` (${filteredDocuments.length} après filtrage)`}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="gap-1"
                >
                  <Calendar className="h-4 w-4 rotate-180" />
                  Précédent
                </Button>

                <div className="flex items-center gap-1">
                  {/* Première page */}
                  {currentPage > 3 && (
                    <>
                      <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        className="w-10"
                      >
                        1
                      </Button>
                      {currentPage > 4 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                    </>
                  )}

                  {/* Pages autour de la page actuelle */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => 
                      page === currentPage ||
                      page === currentPage - 1 ||
                      page === currentPage + 1 ||
                      (currentPage <= 2 && page <= 3) ||
                      (currentPage >= totalPages - 1 && page >= totalPages - 2)
                    )
                    .map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        disabled={isLoading}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    ))}

                  {/* Dernière page */}
                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <Button
                        variant={currentPage === totalPages ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-10"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || isLoading || !hasMore}
                  className="gap-1"
                >
                  Suivant
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de prévisualisation */}
      {selectedDocument && (
        <PdfViewerModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedDocument(null)
          }}
          document={{
            id: selectedDocument.id || '',
            url: selectedDocument.url,
            path: selectedDocument.path,
            uploadedAt: selectedDocument.createdAt,
            uploadedBy: selectedDocument.createdBy,
            originalFileName: selectedDocument.libelle,
            fileSize: selectedDocument.size,
            status: 'active'
          }}
          title={selectedDocument.libelle}
        />
      )}
    </div>
  )
}

