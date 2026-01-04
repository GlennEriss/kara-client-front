import { IPlacementDemandRepository } from "./IPlacementDemandRepository";
import { PlacementDemand, PlacementDemandFilters, PlacementDemandStats } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class PlacementDemandRepository implements IPlacementDemandRepository {
    readonly name = "PlacementDemandRepository";

    async createDemand(data: Omit<PlacementDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<PlacementDemand> {
        try {
            const { collection, doc, setDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Utiliser l'ID personnalisé si fourni, sinon générer un ID automatique
            const demandId = customId || doc(collection(db, firebaseCollectionNames.placementDemands || "placementDemands")).id;
            const demandRef = doc(db, firebaseCollectionNames.placementDemands || "placementDemands", demandId);

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

    async getDemandById(id: string): Promise<PlacementDemand | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const demandRef = doc(db, firebaseCollectionNames.placementDemands || "placementDemands", id);
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
            } as PlacementDemand;
        } catch (error) {
            console.error("Erreur lors de la récupération de la demande:", error);
            return null;
        }
    }

    async getDemandsWithFilters(filters?: PlacementDemandFilters): Promise<PlacementDemand[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            if (filters?.benefactorId) {
                constraints.push(where("benefactorId", "==", filters.benefactorId));
            }

            if (filters?.payoutMode && filters.payoutMode !== 'all') {
                constraints.push(where("payoutMode", "==", filters.payoutMode));
            }

            if (filters?.decisionMadeBy) {
                constraints.push(where("decisionMadeBy", "==", filters.decisionMadeBy));
            }

            constraints.push(orderBy("createdAt", "desc"));

            const q = query(
                collection(db, firebaseCollectionNames.placementDemands || "placementDemands"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let demands: PlacementDemand[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                demands.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    decisionMadeAt: (data.decisionMadeAt as any)?.toDate ? (data.decisionMadeAt as any).toDate() : undefined,
                    reopenedAt: (data.reopenedAt as any)?.toDate ? (data.reopenedAt as any).toDate() : undefined,
                } as PlacementDemand);
            });

            // Filtrage côté client pour recherche textuelle et dates
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                demands = demands.filter((d) =>
                    d.id.toLowerCase().includes(searchLower) ||
                    d.benefactorName?.toLowerCase().includes(searchLower)
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

    async getDemandsStats(filters?: PlacementDemandFilters): Promise<PlacementDemandStats> {
        try {
            const demands = await this.getDemandsWithFilters(filters);

            const stats: PlacementDemandStats = {
                total: demands.length,
                pending: demands.filter(d => d.status === 'PENDING').length,
                approved: demands.filter(d => d.status === 'APPROVED').length,
                rejected: demands.filter(d => d.status === 'REJECTED').length,
                converted: demands.filter(d => d.status === 'CONVERTED').length,
                totalAmount: demands.reduce((sum, d) => sum + d.amount, 0),
                pendingAmount: demands.filter(d => d.status === 'PENDING').reduce((sum, d) => sum + d.amount, 0),
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
                totalAmount: 0,
                pendingAmount: 0,
            };
        }
    }

    async updateDemandStatus(
        id: string,
        status: PlacementDemand['status'],
        adminId: string,
        reason: string,
        adminName: string
    ): Promise<PlacementDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.placementDemands || "placementDemands", id);

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

    async updateDemand(id: string, data: Partial<PlacementDemand>): Promise<PlacementDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.placementDemands || "placementDemands", id);

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

