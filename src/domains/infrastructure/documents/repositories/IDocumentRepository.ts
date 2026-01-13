import { 
  Document,
  DocumentListQuery,
  DocumentListResult,
  DocumentFilters,
  PaginatedDocuments,
  DocumentSortField,
  DocumentSortDirection,
  DocumentSortInput
} from "../entities/document.types";
import { IRepository } from "@/repositories/IRepository";

export type { 
  DocumentSortField, 
  DocumentSortDirection, 
  DocumentSortInput,
  DocumentListQuery,
  DocumentListResult,
  DocumentFilters,
  PaginatedDocuments
};

export interface IDocumentRepository extends IRepository {
    createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<Document>;
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
