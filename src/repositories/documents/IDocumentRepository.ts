import { Document } from "@/types/types";
import { IRepository } from "../IRepository";

export type DocumentSortField = 'type' | 'createdAt' | 'updatedAt'
export type DocumentSortDirection = 'asc' | 'desc'

export interface DocumentSortInput {
    field: DocumentSortField
    direction: DocumentSortDirection
}

export interface DocumentListQuery {
    memberId: string
    page?: number
    pageSize?: number
    type?: string
    sort?: DocumentSortInput[]
}

export interface DocumentListResult {
    documents: Document[]
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    availableTypes: string[]
}

export interface DocumentFilters {
    type?: string
    format?: string
    memberId?: string
    searchQuery?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    page?: number
}

export interface PaginatedDocuments {
    documents: Document[]
    total: number
    hasMore: boolean
    currentPage: number
    totalPages: number
}

export interface IDocumentRepository extends IRepository {
    createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document>;
    getDocumentById(id: string): Promise<Document | null>;
    getDocumentsByContractId(contractId: string): Promise<Document[]>;
    getDocumentsByMemberId(memberId: string): Promise<Document[]>;
    getAllDocuments(filters?: DocumentFilters): Promise<Document[]>;
    getPaginatedDocuments(filters?: DocumentFilters): Promise<PaginatedDocuments>;
    getDocuments(params: DocumentListQuery): Promise<DocumentListResult>;
    updateDocument(id: string, data: Partial<Omit<Document, 'id' | 'createdAt'>>): Promise<Document | null>;
    deleteDocument(id: string): Promise<void>;
    uploadDocumentFile(file: File, memberId: string, documentType: string): Promise<{ url: string; path: string; size: number }>;
    uploadImage(imageUrl: string, memberId: string, contractId: string, imageType: string): Promise<{ url: string; path: string }>;
}

