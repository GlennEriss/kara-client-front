import { User, Admin, ContractCI, Document } from "@/types/types";
import { ICaisseImprevueService } from "./ICaisseImprevueService";
import { IMemberRepository } from "@/repositories/members/IMemberRepository";
import { SubscriptionCI } from "@/types/types";
import { ISubscriptionCIRepository } from "@/repositories/caisse-imprevu/ISubscriptionCIRepository";
import { IContractCIRepository, ContractsCIFilters, ContractsCIStats } from "@/repositories/caisse-imprevu/IContractCIRepository";
import { IAdminRepository } from "@/repositories/admins/IAdminRepository";
import { IDocumentRepository } from "@/repositories/documents/IDocumentRepository";

export class CaisseImprevueService implements ICaisseImprevueService {
    readonly name = "CaisseImprevueService"

    constructor(
        private memberRepository: IMemberRepository, 
        private subscriptionCIRepository: ISubscriptionCIRepository,
        private contractCIRepository: IContractCIRepository,
        private adminRepository: IAdminRepository,
        private documentRepository: IDocumentRepository
    ) {
        this.memberRepository = memberRepository
        this.subscriptionCIRepository = subscriptionCIRepository
        this.contractCIRepository = contractCIRepository
        this.adminRepository = adminRepository
        this.documentRepository = documentRepository
    }

    async searchMembers(searchQuery: string): Promise<User[]> {
        return await this.memberRepository.searchMembers(searchQuery)
    }

    async getAllSubscriptions(): Promise<SubscriptionCI[]> {
        return await this.subscriptionCIRepository.getAllSubscriptions()
    }

    async getActiveSubscriptions(): Promise<SubscriptionCI[]> {
        return await this.subscriptionCIRepository.getActiveSubscriptions()
    }

    async getSubscriptionById(id: string): Promise<SubscriptionCI | null> {
        return await this.subscriptionCIRepository.getSubscriptionById(id)
    }

    async createSubscription(data: Omit<SubscriptionCI, 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI> {
        return await this.subscriptionCIRepository.createSubscription(data)
    }

    async updateSubscription(id: string, data: Partial<SubscriptionCI>): Promise<SubscriptionCI> {
        const result = await this.subscriptionCIRepository.updateSubscription(id, data)
        if (!result) {
            throw new Error(`Forfait avec l'ID ${id} introuvable`)
        }
        return result
    }

    async deleteSubscription(id: string): Promise<void> {
        return await this.subscriptionCIRepository.deleteSubscription(id)
    }

    async createContractCI(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI> {
        return await this.contractCIRepository.createContract(data)
    }

    async getAdminById(id: string): Promise<Admin | null> {
        return await this.adminRepository.getAdminById(id)
    }

    async getContractsCIPaginated(filters?: ContractsCIFilters): Promise<ContractCI[]> {
        return await this.contractCIRepository.getContractsWithFilters(filters)
    }

    async getContractsCIStats(): Promise<ContractsCIStats> {
        return await this.contractCIRepository.getContractsStats()
    }

    async uploadContractDocument(file: File, contractId: string, memberId: string, userId: string): Promise<{ documentId: string; contract: ContractCI }> {
        // 1. Upload du fichier vers Firebase Storage
        const { url, path, size } = await this.documentRepository.uploadDocumentFile(file, memberId, 'ADHESION_CI')

        // 2. Créer l'enregistrement du document dans Firestore
        const documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
            type: 'ADHESION_CI',
            format: 'pdf',
            libelle: `Contrat CI - ${memberId}`,
            path: path,
            url: url,
            size: size,
            memberId: memberId,
            contractId: contractId,
            createdBy: userId,
            updatedBy: userId,
        }

        const document = await this.documentRepository.createDocument(documentData)

        if (!document || !document.id) {
            throw new Error('Erreur lors de la création du document')
        }

        // 3. Mettre à jour le contrat avec l'ID du document
        const updatedContract = await this.contractCIRepository.updateContract(contractId, {
            contractStartId: document.id,
            updatedBy: userId,
        })

        if (!updatedContract) {
            throw new Error(`Contrat ${contractId} introuvable`)
        }

        return {
            documentId: document.id,
            contract: updatedContract
        }
    }

    async getDocumentById(documentId: string): Promise<Document | null> {
        return await this.documentRepository.getDocumentById(documentId)
    }
}