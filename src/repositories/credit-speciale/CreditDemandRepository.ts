import { ICreditDemandRepository, CreditDemandFilters, CreditDemandStats } from "./ICreditDemandRepository";
import { CreditDemand, CreditDemandStatus } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CreditDemandRepository implements ICreditDemandRepository {
    readonly name = "CreditDemandRepository";

    async createDemand(data: Omit<CreditDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CreditDemand> {
        try {
            const { collection, doc, setDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Utiliser l'ID personnalisé si fourni, sinon générer un ID automatique
            const demandId = customId || doc(collection(db, firebaseCollectionNames.creditDemands || "creditDemands")).id;
            const demandRef = doc(db, firebaseCollectionNames.creditDemands || "creditDemands", demandId);

            await setDoc(demandRef, {
                ...cleanData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const created = await this.getDemandById(demandId);
            if (!created) {
                throw new Error("Erreur lors de la récupération de la demande créée");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création de la demande:", error);
            throw error;
        }
    }

    async getDemandById(id: string): Promise<CreditDemand | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const demandRef = doc(db, firebaseCollectionNames.creditDemands || "creditDemands", id);
            const docSnap = await getDoc(demandRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            } as CreditDemand;
        } catch (error) {
            console.error("Erreur lors de la récupération de la demande:", error);
            return null;
        }
    }

    async getAllDemands(): Promise<CreditDemand[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.creditDemands || "creditDemands"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const demands: CreditDemand[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                demands.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditDemand);
            });

            return demands;
        } catch (error) {
            console.error("Erreur lors de la récupération des demandes:", error);
            return [];
        }
    }

    async getDemandsWithFilters(filters?: CreditDemandFilters): Promise<CreditDemand[]> {
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
            constraints.push(orderBy(orderByField, orderByDirection));

            const q = query(
                collection(db, firebaseCollectionNames.creditDemands || "creditDemands"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let demands: CreditDemand[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                demands.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditDemand);
            });

            // Filtrage côté client pour recherche textuelle et dates
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                demands = demands.filter((d) =>
                    d.id.toLowerCase().includes(searchLower) ||
                    d.clientFirstName.toLowerCase().includes(searchLower) ||
                    d.clientLastName.toLowerCase().includes(searchLower) ||
                    d.clientContacts.some(c => c.toLowerCase().includes(searchLower))
                );
            }

            if (filters?.dateFrom) {
                demands = demands.filter((d) => d.createdAt >= filters.dateFrom!);
            }

            if (filters?.dateTo) {
                demands = demands.filter((d) => d.createdAt <= filters.dateTo!);
            }

            // Pagination
            if (filters?.page && filters?.limit) {
                const start = (filters.page - 1) * filters.limit;
                const end = start + filters.limit;
                demands = demands.slice(start, end);
            }

            return demands;
        } catch (error) {
            console.error("Erreur lors de la récupération des demandes filtrées:", error);
            return [];
        }
    }

    async getDemandsStats(filters?: CreditDemandFilters): Promise<CreditDemandStats> {
        try {
            const demands = await this.getDemandsWithFilters(filters);

            const stats: CreditDemandStats = {
                total: demands.length,
                pending: demands.filter(d => d.status === 'PENDING').length,
                approved: demands.filter(d => d.status === 'APPROVED').length,
                rejected: demands.filter(d => d.status === 'REJECTED').length,
                byType: {
                    speciale: demands.filter(d => d.creditType === 'SPECIALE').length,
                    fixe: demands.filter(d => d.creditType === 'FIXE').length,
                    aide: demands.filter(d => d.creditType === 'AIDE').length,
                },
            };

            return stats;
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                byType: { speciale: 0, fixe: 0, aide: 0 },
            };
        }
    }

    async getDemandsByClientId(clientId: string): Promise<CreditDemand[]> {
        return this.getDemandsWithFilters({ clientId });
    }

    async getDemandsByGuarantorId(guarantorId: string): Promise<CreditDemand[]> {
        return this.getDemandsWithFilters({ guarantorId });
    }

    async updateDemand(id: string, data: Partial<Omit<CreditDemand, 'id' | 'createdAt'>>): Promise<CreditDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.creditDemands || "creditDemands", id);

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            await updateDoc(demandRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getDemandById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la demande:", error);
            throw error;
        }
    }

    async deleteDemand(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.creditDemands || "creditDemands", id);
            await deleteDoc(demandRef);
        } catch (error) {
            console.error("Erreur lors de la suppression de la demande:", error);
            throw error;
        }
    }
}

