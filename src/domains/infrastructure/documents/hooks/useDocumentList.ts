'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Document } from '../entities/document.types'
import { useMemberWithSubscription } from '@/hooks/useMembers'
import { DocumentRepository } from '../repositories/DocumentRepository'
import { DocumentService, MemberDocumentList } from '../services/DocumentService'
import { DocumentFilterOption } from '../utils/documentTypes'

const PAGE_SIZE = 10

const repository = new DocumentRepository()
const service = new DocumentService(repository)

export interface UseDocumentListResult {
  documents: Document[]
  filterOptions: DocumentFilterOption[]
  isLoading: boolean
  isError: boolean
  member: ReturnType<typeof useMemberWithSubscription>['data']
  isMemberLoading: boolean
  pagination: {
    page: number
    totalPages: number
    pageSize: number
    totalItems: number
  }
  selectedType: string
  setSelectedType: (value: string) => void
  setPage: (nextPage: number) => void
}

export function useDocumentList(memberId: string): UseDocumentListResult {
  const [page, setPageInternal] = useState(1)
  const [selectedType, setSelectedTypeInternal] = useState<string>('')
  const {
    data: member,
    isLoading: isMemberLoading,
  } = useMemberWithSubscription(memberId)

  useEffect(() => {
    setPageInternal(1)
  }, [selectedType])

  const queryKey = useMemo(
    () => ['documents', memberId, page, selectedType],
    [memberId, page, selectedType]
  )

  const queryFn = useCallback(async (): Promise<MemberDocumentList> => {
    if (!memberId) {
      throw new Error('memberId est requis pour récupérer les documents')
    }

    return service.getMemberDocuments({
      memberId,
      page,
      pageSize: PAGE_SIZE,
      type: selectedType || undefined,
    })
  }, [memberId, page, selectedType])

  const { data, isLoading, isError, isFetching } = useQuery<MemberDocumentList>({
    queryKey,
    queryFn,
    enabled: Boolean(memberId),
    placeholderData: (previousData) => previousData,
  })

  const setPage = useCallback(
    (nextPage: number) => {
      setPageInternal(prev => {
        const bounded = Math.max(1, nextPage)
        const totalPages = data?.pagination.totalPages ?? prev
        return Math.min(bounded, totalPages)
      })
    },
    [data?.pagination.totalPages]
  )

  const setSelectedType = useCallback((value: string) => {
    setSelectedTypeInternal(value)
  }, [])

  const pagination = data?.pagination

  return {
    documents: data?.documents ?? [],
    filterOptions: data?.filters ?? [],
    isLoading: isLoading || isFetching,
    isError,
    member,
    isMemberLoading,
    pagination: {
      page: pagination?.page ?? page,
      totalPages: pagination?.totalPages ?? 1,
      pageSize: pagination?.pageSize ?? PAGE_SIZE,
      totalItems: pagination?.totalItems ?? 0,
    },
    selectedType,
    setSelectedType,
    setPage,
  }
}
