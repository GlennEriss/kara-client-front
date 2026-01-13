import { Document } from '../entities/document.types'
import { DocumentRepository } from '../repositories/DocumentRepository'
import { IDocumentRepository } from '../repositories/IDocumentRepository'
import {
  DocumentListQuery,
  DocumentSortInput,
} from '../repositories/IDocumentRepository'
import {
  buildDocumentFilterOptions,
  DocumentFilterOption,
} from '../utils/documentTypes'

export type MemberDocumentQueryParams = DocumentListQuery

export interface MemberDocumentList {
  documents: Document[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  filters: DocumentFilterOption[]
  appliedSort: DocumentSortInput[]
}

const DEFAULT_PAGE_SIZE = 10
const DEFAULT_SORT: DocumentSortInput[] = [
  { field: 'type', direction: 'asc' },
  { field: 'createdAt', direction: 'desc' },
]

export class DocumentService {
  constructor(private readonly repository: IDocumentRepository) {}

  async getMemberDocuments(params: MemberDocumentQueryParams): Promise<MemberDocumentList> {
    const effectiveParams: DocumentListQuery = {
      ...params,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
      sort: params.sort && params.sort.length > 0 ? params.sort : DEFAULT_SORT,
    }

    const response = await this.repository.getDocuments(effectiveParams)

    const typeList = response.documents.map(doc => doc.type).filter(Boolean) as string[]
    const filters = buildDocumentFilterOptions([
      ...response.availableTypes,
      ...typeList,
    ])

    return {
      documents: response.documents,
      pagination: {
        page: response.page,
        pageSize: response.pageSize,
        totalItems: response.totalItems,
        totalPages: response.totalPages,
      },
      filters,
      appliedSort: effectiveParams.sort ?? DEFAULT_SORT,
    }
  }
}
