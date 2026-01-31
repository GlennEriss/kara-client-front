import { ICreditContractRepository, CreditContractFilters, CreditContractStats } from "./ICreditContractRepository";
import { CreditContract } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CreditContractRepository implements ICreditContractRepository {
    readonly name = "CreditContractRepository";

    async createContract(data: Omit<CreditContract, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CreditContract> {
        try {
            const { collection, doc, setDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Utiliser l'ID personnalisé si fourni, sinon générer un ID automatique
            const contractId = customId || doc(collection(db, firebaseCollectionNames.creditContracts || "creditContracts")).id;
            const contractRef = doc(db, firebaseCollectionNames.creditContracts || "creditContracts", contractId);

            await setDoc(contractRef, {
                ...cleanData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const created = await this.getContractById(contractId);
            if (!created) {
                throw new Error("Erreur lors de la récupération du contrat créé");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création du contrat:", error);
            throw error;
        }
    }

    async getContractById(id: string): Promise<CreditContract | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const contractRef = doc(db, firebaseCollectionNames.creditContracts || "creditContracts", id);
            const docSnap = await getDoc(contractRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                firstPaymentDate: (data.firstPaymentDate as any)?.toDate ? (data.firstPaymentDate as any).toDate() : (data.firstPaymentDate ? new Date(data.firstPaymentDate) : undefined),
                nextDueAt: (data.nextDueAt as any)?.toDate ? (data.nextDueAt as any).toDate() : (data.nextDueAt ? new Date(data.nextDueAt) : undefined),
                activatedAt: (data.activatedAt as any)?.toDate ? (data.activatedAt as any).toDate() : (data.activatedAt ? new Date(data.activatedAt) : undefined),
                fundsReleasedAt: (data.fundsReleasedAt as any)?.toDate ? (data.fundsReleasedAt as any).toDate() : (data.fundsReleasedAt ? new Date(data.fundsReleasedAt) : undefined),
                dischargedAt: (data.dischargedAt as any)?.toDate ? (data.dischargedAt as any).toDate() : (data.dischargedAt ? new Date(data.dischargedAt) : undefined),
                transformedAt: (data.transformedAt as any)?.toDate ? (data.transformedAt as any).toDate() : (data.transformedAt ? new Date(data.transformedAt) : undefined),
                extendedAt: (data.extendedAt as any)?.toDate ? (data.extendedAt as any).toDate() : (data.extendedAt ? new Date(data.extendedAt) : undefined),
                blockedAt: (data.blockedAt as any)?.toDate ? (data.blockedAt as any).toDate() : (data.blockedAt ? new Date(data.blockedAt) : undefined),
                scoreUpdatedAt: (data.scoreUpdatedAt as any)?.toDate ? (data.scoreUpdatedAt as any).toDate() : (data.scoreUpdatedAt ? new Date(data.scoreUpdatedAt) : undefined),
            } as CreditContract;
        } catch {
            return null;
        }
    }

    async getAllContracts(): Promise<CreditContract[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.creditContracts || "creditContracts"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const contracts: CreditContract[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                contracts.push(this.mapContractData(doc.id, data));
            });

            return contracts;
        } catch {
            return [];
        }
    }

    private mapContractData(id: string, data: any): CreditContract {
        return {
            id,
            ...(data as any),
            createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
            updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            firstPaymentDate: (data.firstPaymentDate as any)?.toDate ? (data.firstPaymentDate as any).toDate() : (data.firstPaymentDate ? new Date(data.firstPaymentDate) : undefined),
            nextDueAt: (data.nextDueAt as any)?.toDate ? (data.nextDueAt as any).toDate() : (data.nextDueAt ? new Date(data.nextDueAt) : undefined),
            activatedAt: (data.activatedAt as any)?.toDate ? (data.activatedAt as any).toDate() : (data.activatedAt ? new Date(data.activatedAt) : undefined),
            fundsReleasedAt: (data.fundsReleasedAt as any)?.toDate ? (data.fundsReleasedAt as any).toDate() : (data.fundsReleasedAt ? new Date(data.fundsReleasedAt) : undefined),
            dischargedAt: (data.dischargedAt as any)?.toDate ? (data.dischargedAt as any).toDate() : (data.dischargedAt ? new Date(data.dischargedAt) : undefined),
            transformedAt: (data.transformedAt as any)?.toDate ? (data.transformedAt as any).toDate() : (data.transformedAt ? new Date(data.transformedAt) : undefined),
            extendedAt: (data.extendedAt as any)?.toDate ? (data.extendedAt as any).toDate() : (data.extendedAt ? new Date(data.extendedAt) : undefined),
            blockedAt: (data.blockedAt as any)?.toDate ? (data.blockedAt as any).toDate() : (data.blockedAt ? new Date(data.blockedAt) : undefined),
            scoreUpdatedAt: (data.scoreUpdatedAt as any)?.toDate ? (data.scoreUpdatedAt as any).toDate() : (data.scoreUpdatedAt ? new Date(data.scoreUpdatedAt) : undefined),
        } as CreditContract;
    }

    async getContractsWithFilters(filters?: CreditContractFilters): Promise<CreditContract[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            if (filters?.creditType && filters.creditType !== 'all') {
                constraints.push(where("creditType", "==", filters.creditType));
            }

            if (filters?.clientId) {
                constraints.push(where("clientId", "==", filters.clientId));
            }

            if (filters?.guarantorId) {
                constraints.push(where("guarantorId", "==", filters.guarantorId));
            }

            const orderByField = filters?.orderByField || "createdAt";
            const orderByDirection = filters?.orderByDirection || "desc";
            
            // Pour nextDueAt, on doit l'ajouter comme index composite ou utiliser une requête différente
            if (orderByField === "nextDueAt") {
                constraints.push(orderBy("nextDueAt", orderByDirection));
            } else {
                constraints.push(orderBy(orderByField, orderByDirection));
            }

            const q = query(
                collection(db, firebaseCollectionNames.creditContracts || "creditContracts"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let contracts: CreditContract[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                contracts.push(this.mapContractData(doc.id, data));
            });

            // Filtrage côté client
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                contracts = contracts.filter((c) =>
                    (c.id || '').toLowerCase().includes(searchLower) ||
                    (c.clientFirstName || '').toLowerCase().includes(searchLower) ||
                    (c.clientLastName || '').toLowerCase().includes(searchLower) ||
                    (c.clientContacts || []).some(contact => (contact || '').toLowerCase().includes(searchLower))
                );
            }

            if (filters?.overdueOnly) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                contracts = contracts.filter((c) => {
                    // PARTIAL = partiellement remboursé, pas forcément en retard.
                    // Retard = statut OVERDUE explicite ou nextDueAt dépassée.
                    if (c.status === 'OVERDUE') {
                        return true;
                    }
                    if ((c.status === 'ACTIVE' || c.status === 'PARTIAL') && c.nextDueAt) {
                        const nextDue = c.nextDueAt instanceof Date ? c.nextDueAt : new Date(c.nextDueAt);
                        nextDue.setHours(0, 0, 0, 0);
                        return nextDue < today;
                    }
                    return false;
                });
            }

            if (filters?.dateFrom) {
                contracts = contracts.filter((c) => c.createdAt >= filters.dateFrom!);
            }

            if (filters?.dateTo) {
                contracts = contracts.filter((c) => c.createdAt <= filters.dateTo!);
            }

            // Pagination
            if (filters?.page && filters?.limit) {
                const start = (filters.page - 1) * filters.limit;
                const end = start + filters.limit;
                contracts = contracts.slice(start, end);
            }

            return contracts;
        } catch {
            return [];
        }
    }

    async getContractsStats(filters?: CreditContractFilters): Promise<CreditContractStats> {
        try {
            const contracts = await this.getContractsWithFilters(filters);

            const stats: CreditContractStats = {
                total: contracts.length,
                active: contracts.filter(c => c.status === 'ACTIVE').length,
                overdue: contracts.filter(c => c.status === 'OVERDUE').length,
                partial: contracts.filter(c => c.status === 'PARTIAL').length,
                transformed: contracts.filter(c => c.status === 'TRANSFORMED').length,
                blocked: contracts.filter(c => c.status === 'BLOCKED').length,
                discharged: contracts.filter(c => c.status === 'DISCHARGED').length,
                closed: contracts.filter(c => c.status === 'CLOSED').length,
                totalAmount: contracts.reduce((sum, c) => sum + c.amount, 0),
                totalPaid: contracts.reduce((sum, c) => sum + c.amountPaid, 0),
                totalRemaining: contracts.reduce((sum, c) => sum + c.amountRemaining, 0),
                totalPenalties: 0, // Sera calculé via le repository des pénalités
                byType: {
                    speciale: contracts.filter(c => c.creditType === 'SPECIALE').length,
                    fixe: contracts.filter(c => c.creditType === 'FIXE').length,
                    aide: contracts.filter(c => c.creditType === 'AIDE').length,
                },
            };

            return stats;
        } catch {
            return {
                total: 0,
                active: 0,
                overdue: 0,
                partial: 0,
                transformed: 0,
                blocked: 0,
                discharged: 0,
                closed: 0,
                totalAmount: 0,
                totalPaid: 0,
                totalRemaining: 0,
                totalPenalties: 0,
                byType: { speciale: 0, fixe: 0, aide: 0 },
            };
        }
    }

    async getContractsByClientId(clientId: string): Promise<CreditContract[]> {
        return this.getContractsWithFilters({ clientId });
    }

    async getContractsByGuarantorId(guarantorId: string): Promise<CreditContract[]> {
        return this.getContractsWithFilters({ guarantorId });
    }

    async getOverdueContracts(): Promise<CreditContract[]> {
        return this.getContractsWithFilters({ overdueOnly: true });
    }

    async updateContract(id: string, data: Partial<Omit<CreditContract, 'id' | 'createdAt'>>): Promise<CreditContract | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const contractRef = doc(db, firebaseCollectionNames.creditContracts || "creditContracts", id);

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            await updateDoc(contractRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getContractById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du contrat:", error);
            throw error;
        }
    }

    async deleteContract(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const contractRef = doc(db, firebaseCollectionNames.creditContracts || "creditContracts", id);
            await deleteDoc(contractRef);
        } catch (error) {
            console.error("Erreur lors de la suppression du contrat:", error);
            throw error;
        }
    }
}

