import { Document } from "@/types/types";
import { IRepository } from "../IRepository";

export interface IDocumentRepository extends IRepository {
    createDocument(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document>;
    getDocumentById(id: string): Promise<Document | null>;
    getDocumentsByContractId(contractId: string): Promise<Document[]>;
    getDocumentsByMemberId(memberId: string): Promise<Document[]>;
    updateDocument(id: string, data: Partial<Omit<Document, 'id' | 'createdAt'>>): Promise<Document | null>;
    deleteDocument(id: string): Promise<void>;
    uploadDocumentFile(file: File, memberId: string, documentType: string): Promise<{ url: string; path: string; size: number }>;
    uploadImage(imageUrl: string, memberId: string, contractId: string, imageType: string): Promise<{ url: string; path: string }>;
}

