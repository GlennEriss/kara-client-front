import { ICaisseSpecialeDemandRepository } from "./ICaisseSpecialeDemandRepository";
import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CaisseSpecialeDemandRepository implements ICaisseSpecialeDemandRepository {
    readonly name = "CaisseSpecialeDemandRepository";

    async createDemand(data: Omit<CaisseSpecialeDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CaisseSpecialeDemand> {
        try {
            const { collection, doc, setDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Utiliser l'ID personnalisé si fourni, sinon générer un ID automatique
            const demandId = customId || doc(collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands")).id;
            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", demandId);

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

    async getDemandById(id: string): Promise<CaisseSpecialeDemand | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);
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
                decisionMadeAt: (data.decisionMadeAt as any)?.toDate ? (data.decisionMadeAt as any).toDate() : undefined,
                reopenedAt: (data.reopenedAt as any)?.toDate ? (data.reopenedAt as any).toDate() : undefined,
            } as CaisseSpecialeDemand;
        } catch (error) {
            console.error("Erreur lors de la récupération de la demande:", error);
            return null;
        }
    }

    async getDemandsWithFilters(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemand[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            if (filters?.contractType && filters.contractType !== 'all') {
                constraints.push(where("contractType", "==", filters.contractType));
            }

            if (filters?.caisseType && filters.caisseType !== 'all') {
                constraints.push(where("caisseType", "==", filters.caisseType));
            }

            if (filters?.memberId) {
                constraints.push(where("memberId", "==", filters.memberId));
            }

            if (filters?.groupeId) {
                constraints.push(where("groupeId", "==", filters.groupeId));
            }

            if (filters?.decisionMadeBy) {
                constraints.push(where("decisionMadeBy", "==", filters.decisionMadeBy));
            }

            constraints.push(orderBy("createdAt", "desc"));

            const q = query(
                collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let demands: CaisseSpecialeDemand[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                demands.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    decisionMadeAt: (data.decisionMadeAt as any)?.toDate ? (data.decisionMadeAt as any).toDate() : undefined,
                } as CaisseSpecialeDemand);
            });

            // Filtrage côté client pour recherche textuelle et dates
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                demands = demands.filter((d) =>
                    d.id.toLowerCase().includes(searchLower)
                );
            }

            if (filters?.createdAtFrom) {
                demands = demands.filter((d) => d.createdAt >= filters.createdAtFrom!);
            }

            if (filters?.createdAtTo) {
                demands = demands.filter((d) => d.createdAt <= filters.createdAtTo!);
            }

            if (filters?.desiredDateFrom) {
                demands = demands.filter((d) => new Date(d.desiredDate) >= filters.desiredDateFrom!);
            }

            if (filters?.desiredDateTo) {
                demands = demands.filter((d) => new Date(d.desiredDate) <= filters.desiredDateTo!);
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

    async getDemandsStats(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandStats> {
        try {
            const demands = await this.getDemandsWithFilters(filters);

            const stats: CaisseSpecialeDemandStats = {
                total: demands.length,
                pending: demands.filter(d => d.status === 'PENDING').length,
                approved: demands.filter(d => d.status === 'APPROVED').length,
                rejected: demands.filter(d => d.status === 'REJECTED').length,
                converted: demands.filter(d => d.status === 'CONVERTED').length,
            };

            return stats;
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                converted: 0,
            };
        }
    }

    async updateDemandStatus(
        id: string,
        status: CaisseSpecialeDemand['status'],
        adminId: string,
        reason: string,
        adminName: string
    ): Promise<CaisseSpecialeDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);

            await updateDoc(demandRef, {
                status,
                decisionMadeAt: serverTimestamp(),
                decisionMadeBy: adminId,
                decisionMadeByName: adminName,
                decisionReason: reason,
                updatedBy: adminId,
                updatedAt: serverTimestamp(),
            });

            return await this.getDemandById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du statut de la demande:", error);
            throw error;
        }
    }

    async updateDemand(id: string, data: Partial<CaisseSpecialeDemand>): Promise<CaisseSpecialeDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);

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
}

