'use client'

import React, { useMemo, useState } from 'react'
import { useDocumentList } from '@/domains/infrastructure/documents/hooks/useDocumentList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, FileText, Eye, Download, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_ORDER,
  DocumentFilterOption,
  getDocumentTypeInfo,
} from '@/domains/infrastructure/documents/utils/documentTypes'
import { DocumentPreviewModal } from '@/components/member/DocumentPreviewModal'
import type { Document as DocumentType } from '@/domains/infrastructure/documents/entities/document.types'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'

interface ListDocumentsV2Props {
  memberId: string
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * ListDocumentsV2 - Version 2 avec design moderne et couleurs KARA
 * 
 * Améliorations :
 * - Design table/liste compact au lieu de cards énormes
 * - Couleurs KARA (kara-primary-dark, kara-primary-light)
 * - Vue responsive : table sur desktop/tablet, cards sur mobile
 * - Sélecteurs stables avec data-testid pour les tests E2E
 */
export default function ListDocumentsV2({ memberId }: ListDocumentsV2Props) {
  const {
    documents,
    filterOptions,
    isLoading,
    isError,
    member,
    isMemberLoading,
    pagination,
    selectedType,
    setSelectedType,
    setPage,
  } = useDocumentList(memberId)

  const [previewDocument, setPreviewDocument] = useState<DocumentType | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const groupedFilterOptions = useMemo(() => {
    const groups: Record<string, DocumentFilterOption[]> = {}
    DOCUMENT_CATEGORY_ORDER.forEach(category => {
      groups[category] = []
    })

    filterOptions.forEach(option => {
      if (!groups[option.category]) {
        groups[option.category] = []
      }
      groups[option.category].push(option)
    })

    return groups
  }, [filterOptions])

  const fullName = useMemo(() => {
    if (!member) return 'Membre'
    const first = member.firstName?.trim() ?? ''
    const last = member.lastName?.trim() ?? ''
    const name = `${first} ${last}`.trim()
    return name.length > 0 ? name : 'Membre'
  }, [member])

  const memberInitials = useMemo(() => {
    if (!member) return 'M'
    const first = member.firstName?.[0] ?? ''
    const last = member.lastName?.[0] ?? ''
    const initials = `${first}${last}`.trim()
    return initials.length > 0 ? initials.toUpperCase() : 'M'
  }, [member])

  const membershipTypeLabel = useMemo(() => {
    if (!member?.membershipType) return null
    return MEMBERSHIP_TYPE_LABELS[member.membershipType] ?? member.membershipType
  }, [member])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="documents-loading">
        <Loader2 className="h-8 w-8 animate-spin text-kara-primary-dark" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive" data-testid="documents-error">
        <AlertDescription>Impossible de récupérer les documents pour le moment.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="documents-list-v2">
      {/* Header avec informations du membre */}
      <Card className="border-kara-primary-dark/10 shadow-sm" data-testid="documents-header">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {isMemberLoading ? (
                <Skeleton className="h-12 w-12 rounded-full" />
              ) : (
                <Avatar className="h-12 w-12 border-2 border-kara-primary-dark/20" data-testid="member-avatar">
                  <AvatarImage src={member?.photoURL ?? undefined} alt={fullName} />
                  <AvatarFallback className="bg-kara-primary-dark text-white font-semibold">
                    {memberInitials}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl sm:text-2xl font-bold text-kara-primary-dark" data-testid="documents-title">
                  Documents du membre
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground" data-testid="member-name">{fullName}</span>
                  {member?.matricule && (
                    <Badge variant="outline" className="text-xs font-medium text-kara-primary-dark border-kara-primary-dark/30" data-testid="member-matricule">
                      {member.matricule}
                    </Badge>
                  )}
                  {membershipTypeLabel && (
                    <Badge className="text-xs bg-kara-primary-light text-kara-primary-dark border-none shadow-sm" data-testid="member-type">
                      {membershipTypeLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Filtre par type */}
            <div className="w-full sm:w-64" data-testid="documents-filter">
              <Select
                value={selectedType || 'all'}
                onValueChange={(value) => setSelectedType(value === 'all' ? '' : value)}
              >
                <SelectTrigger 
                  className="bg-white border-kara-primary-dark/20 text-kara-primary-dark focus:border-kara-primary-dark focus:ring-kara-primary-dark/40"
                  data-testid="select-document-type"
                >
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-kara-primary-dark/20 shadow-lg">
                  <SelectItem value="all" data-testid="filter-option-all">Tous les types</SelectItem>
                  {DOCUMENT_CATEGORY_ORDER.map((category) => {
                    const options = groupedFilterOptions[category]
                    if (!options || options.length === 0) return null
                    return (
                      <SelectGroup key={category}>
                        <SelectLabel>{DOCUMENT_CATEGORY_LABELS[category]}</SelectLabel>
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value} data-testid={`filter-option-${option.value}`}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-kara-primary-dark/20 bg-white/80 p-8 text-center text-kara-primary-dark/70" data-testid="documents-empty">
              <FileText className="h-12 w-12 mx-auto mb-3 text-kara-primary-dark/30" />
              <p className="font-medium">Aucun document trouvé pour ce membre.</p>
            </div>
          ) : (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-kara-primary-dark/10 bg-white overflow-hidden" data-testid="documents-list-cards">
                {documents.map((document) => {
                  const info = getDocumentTypeInfo(document.type)
                  const categoryLabel = DOCUMENT_CATEGORY_LABELS[info.category]

                  return (
                    <div
                      key={document.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`document-card-${document.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-primary-light/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`document-name-${document.id}`}>
                          {document.libelle}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Badge className={cn('text-xs capitalize border', info.colorClass)} data-testid={`document-type-badge-${document.id}`}>
                            {info.label}
                          </Badge>
                          <span className="text-xs">{(document.size / 1024 / 1024).toFixed(2)} Mo</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {document.createdAt
                            ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : 'Date inconnue'}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 shrink-0"
                            data-testid={`btn-menu-document-${document.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            asChild
                            className="cursor-pointer"
                          >
                            <a
                              href={document.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`btn-download-document-${document.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </a>
                          </DropdownMenuItem>
                          {document.format === 'pdf' && document.url && (
                            <DropdownMenuItem 
                              onClick={() => {
                                setPreviewDocument(document)
                                setIsPreviewOpen(true)
                              }}
                              className="cursor-pointer"
                              data-testid={`btn-preview-document-${document.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Aperçu
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>

              {/* Vue Table - Desktop/Tablette */}
              <div className="hidden sm:block rounded-lg border border-kara-primary-dark/10 overflow-hidden" data-testid="documents-list-table">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Document</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Type</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Taille</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Date</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((document) => {
                      const info = getDocumentTypeInfo(document.type)
                      return (
                        <TableRow
                          key={document.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`document-row-${document.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-primary-light/20 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-kara-primary-dark" aria-hidden="true" />
                              </div>
                              <span className="font-medium text-gray-900" data-testid={`document-name-desktop-${document.id}`}>
                                {document.libelle}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('capitalize border', info.colorClass)} data-testid={`document-type-badge-desktop-${document.id}`}>
                              {info.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground" data-testid={`document-size-${document.id}`}>
                              {(document.size / 1024 / 1024).toFixed(2)} Mo
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground" data-testid={`document-date-${document.id}`}>
                              {document.createdAt
                                ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                  })
                                : 'Date inconnue'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                                className="h-8 px-2 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-download-document-desktop-${document.id}`}
                              >
                                <a
                                  href={document.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Télécharger
                                </a>
                              </Button>
                              {document.format === 'pdf' && document.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewDocument(document)
                                    setIsPreviewOpen(true)
                                  }}
                                  className="h-8 px-2 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                  data-testid={`btn-preview-document-desktop-${document.id}`}
                                  aria-label={`Aperçu ${document.libelle}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Aperçu
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between" data-testid="documents-pagination">
                  <div className="text-sm text-muted-foreground" data-testid="pagination-info">
                    Page {pagination.page} sur {pagination.totalPages} — {pagination.totalItems} document{pagination.totalItems > 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="border-kara-primary-dark/20 hover:bg-kara-primary-light/10 hover:text-kara-primary-dark"
                      data-testid="btn-pagination-prev"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="border-kara-primary-dark/20 hover:bg-kara-primary-light/10 hover:text-kara-primary-dark"
                      data-testid="btn-pagination-next"
                    >
                      Suivant
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false)
          setPreviewDocument(null)
        }}
        documentUrl={previewDocument?.url ?? null}
        documentName={previewDocument?.libelle ?? 'Document'}
        documentLabel={previewDocument ? getDocumentTypeInfo(previewDocument.type).label : ''}
      />
    </div>
  )
}
