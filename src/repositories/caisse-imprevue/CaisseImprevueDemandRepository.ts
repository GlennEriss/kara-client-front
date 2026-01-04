import { ICaisseImprevueDemandRepository } from "./ICaisseImprevueDemandRepository";
import { CaisseImprevueDemand, CaisseImprevueDemandFilters, CaisseImprevueDemandStats } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CaisseImprevueDemandRepository implements ICaisseImprevueDemandRepository {
    readonly name = "CaisseImprevueDemandRepository";

    async createDemand(data: Omit<CaisseImprevueDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CaisseImprevueDemand> {
        try {
            const { collection, doc, setDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Utiliser l'ID personnalisé si fourni, sinon générer un ID automatique
            const demandId = customId || doc(collection(db, firebaseCollectionNames.caisseImprevueDemands || "caisseImprevueDemands")).id;
            const demandRef = doc(db, firebaseCollectionNames.caisseImprevueDemands || "caisseImprevueDemands", demandId);

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

    async getDemandById(id: string): Promise<CaisseImprevueDemand | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const demandRef = doc(db, firebaseCollectionNames.caisseImprevueDemands || "caisseImprevueDemands", id);
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
            } as CaisseImprevueDemand;
        } catch (error) {
            console.error("Erreur lors de la récupération de la demande:", error);
            return null;
        }
    }

    async getDemandsWithFilters(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemand[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            if (filters?.paymentFrequency && filters.paymentFrequency !== 'all') {
                constraints.push(where("paymentFrequency", "==", filters.paymentFrequency));
            }

            if (filters?.subscriptionCIID) {
                constraints.push(where("subscriptionCIID", "==", filters.subscriptionCIID));
            }

            if (filters?.memberId) {
                constraints.push(where("memberId", "==", filters.memberId));
            }

            if (filters?.decisionMadeBy) {
                constraints.push(where("decisionMadeBy", "==", filters.decisionMadeBy));
            }

            constraints.push(orderBy("createdAt", "desc"));

            const q = query(
                collection(db, firebaseCollectionNames.caisseImprevueDemands || "caisseImprevueDemands"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let demands: CaisseImprevueDemand[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                demands.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    decisionMadeAt: (data.decisionMadeAt as any)?.toDate ? (data.decisionMadeAt as any).toDate() : undefined,
                    reopenedAt: (data.reopenedAt as any)?.toDate ? (data.reopenedAt as any).toDate() : undefined,
                } as CaisseImprevueDemand);
            });

            // Filtrage côté client pour recherche textuelle et dates
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                demands = demands.filter((d) =>
                    d.id.toLowerCase().includes(searchLower) ||
                    (d.memberFirstName && d.memberFirstName.toLowerCase().includes(searchLower)) ||
                    (d.memberLastName && d.memberLastName.toLowerCase().includes(searchLower))
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

    async getDemandsStats(filters?: CaisseImprevueDemandFilters): Promise<CaisseImprevueDemandStats> {
        try {
            const demands = await this.getDemandsWithFilters(filters);

            const stats: CaisseImprevueDemandStats = {
                total: demands.length,
                pending: demands.filter(d => d.status === 'PENDING').length,
                approved: demands.filter(d => d.status === 'APPROVED').length,
                rejected: demands.filter(d => d.status === 'REJECTED').length,
                converted: demands.filter(d => d.status === 'CONVERTED').length,
                reopened: demands.filter(d => d.status === 'REOPENED').length,
                daily: demands.filter(d => d.paymentFrequency === 'DAILY').length,
                monthly: demands.filter(d => d.paymentFrequency === 'MONTHLY').length,
                totalAmount: demands.reduce((sum, d) => sum + d.subscriptionCIAmountPerMonth, 0),
                pendingAmount: demands.filter(d => d.status === 'PENDING').reduce((sum, d) => sum + d.subscriptionCIAmountPerMonth, 0),
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
                reopened: 0,
                daily: 0,
                monthly: 0,
                totalAmount: 0,
                pendingAmount: 0,
            };
        }
    }

    async updateDemandStatus(
        id: string,
        status: CaisseImprevueDemand['status'],
        decisionInfo?: { adminId: string; adminName: string; reason: string; decisionMadeAt: Date },
        reopenInfo?: { adminId: string; adminName: string; reason: string; reopenedAt: Date }
    ): Promise<CaisseImprevueDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp, Timestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.caisseImprevueDemands || "caisseImprevueDemands", id);

            const updateData: any = {
                status,
                updatedAt: serverTimestamp(),
            };

            if (decisionInfo) {
                updateData.decisionMadeAt = Timestamp.fromDate(decisionInfo.decisionMadeAt);
                updateData.decisionMadeBy = decisionInfo.adminId;
                updateData.decisionMadeByName = decisionInfo.adminName;
                updateData.decisionReason = decisionInfo.reason;
                updateData.updatedBy = decisionInfo.adminId;
            }

            if (reopenInfo) {
                updateData.reopenedAt = Timestamp.fromDate(reopenInfo.reopenedAt);
                updateData.reopenedBy = reopenInfo.adminId;
                updateData.reopenedByName = reopenInfo.adminName;
                updateData.reopenReason = reopenInfo.reason;
                updateData.updatedBy = reopenInfo.adminId;
            }

            await updateDoc(demandRef, updateData);

            return await this.getDemandById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du statut de la demande:", error);
            throw error;
        }
    }

    async updateDemand(id: string, data: Partial<CaisseImprevueDemand>): Promise<CaisseImprevueDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.caisseImprevueDemands || "caisseImprevueDemands", id);

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

