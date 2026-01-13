'use client'

import React, { useMemo, useState } from 'react'
import { useDocumentList } from '@/domains/infrastructure/documents/hooks/useDocumentList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, Eye } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_CATEGORY_ORDER,
  DocumentFilterOption,
  getDocumentTypeInfo,
} from '@/domains/infrastructure/documents/utils/documentTypes'
import { DocumentPreviewModal } from './DocumentPreviewModal'
import type { Document as DocumentType } from '@/domains/infrastructure/documents/entities/document.types'
import { MEMBERSHIP_TYPE_LABELS } from '@/types/types'

interface ListDocumentsProps {
  memberId: string
}

export default function ListDocuments({ memberId }: ListDocumentsProps) {
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[#234D65]" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-12 text-center text-red-600">
          Impossible de récupérer les documents pour le moment.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Card className="shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              {isMemberLoading ? (
                <Skeleton className="h-14 w-14 rounded-full" />
              ) : (
                <Avatar className="h-14 w-14 border-2 border-[#234D65]/20">
                  <AvatarImage src={member?.photoURL ?? undefined} alt={fullName} />
                  <AvatarFallback className="bg-[#234D65] text-white font-semibold">
                    {memberInitials}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-2xl font-bold text-[#234D65] break-words">
                  Documents du membre
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-900 break-words">{fullName}</span>
                  {member?.matricule && (
                    <Badge variant="outline" className="text-xs font-medium text-[#234D65] border-[#234D65]/30">
                      {member.matricule}
                    </Badge>
                  )}
                  {membershipTypeLabel && (
                    <Badge className="text-xs bg-gradient-to-r from-[#CBB171] to-[#e2c25f] text-[#2f2205] border-none shadow-sm">
                      {membershipTypeLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <Select
                value={selectedType || 'all'}
                onValueChange={(value) => setSelectedType(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="bg-white border border-[#234D65]/20 text-[#234D65] focus:border-[#234D65] focus:ring-[#234D65]/40">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#234D65]/20 shadow-lg">
                  <SelectItem value="all">Tous les types</SelectItem>
                  {DOCUMENT_CATEGORY_ORDER.map((category) => {
                    const options = groupedFilterOptions[category]
                    if (!options || options.length === 0) return null
                    return (
                      <SelectGroup key={category}>
                        <SelectLabel>{DOCUMENT_CATEGORY_LABELS[category]}</SelectLabel>
                        {options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
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

        <CardContent className="space-y-4 bg-gradient-to-br from-white via-white to-[#f3f7fb] rounded-b-2xl p-6">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#234D65]/20 bg-white/80 p-8 text-center text-[#234D65]/70 shadow-inner">
              Aucun document trouvé pour ce membre.
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => {
                const info = getDocumentTypeInfo(document.type)
                const categoryLabel = DOCUMENT_CATEGORY_LABELS[info.category]

                return (
                  <div
                    key={document.id}
                    className="flex w-full flex-col gap-4 rounded-xl border border-[#234D65]/15 bg-white/95 p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white shadow-md">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="break-words text-base font-semibold text-[#1b2f3d]">
                          {document.libelle}
                        </div>
                        <div className="break-words text-sm text-[#3d4f5d]">
                          Ajouté le{' '}
                          {document.createdAt
                            ? new Date(document.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Date inconnue'}
                        </div>
                        <div className="text-sm text-[#3d4f5d]">
                          Taille : {(document.size / 1024 / 1024).toFixed(2)} Mo
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <Badge className={cn('max-w-full break-words capitalize border shadow-sm', info.colorClass)}>
                          {info.label}
                        </Badge>
                        <span className="break-words text-xs text-[#2f4d62]/80 text-left sm:text-right">{categoryLabel}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#1b3a4e] hover:text-[#10222f] hover:underline"
                        >
                          Télécharger
                        </a>

                        {document.format === 'pdf' && document.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[#234D65] hover:text-[#10222f]"
                            onClick={() => {
                              setPreviewDocument(document)
                              setIsPreviewOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Aperçu
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {documents.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.totalPages} — {pagination.totalItems} documents
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
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
