import { ICreditPenaltyRepository, CreditPenaltyFilters, CreditPenaltyStats } from "./ICreditPenaltyRepository";
import { CreditPenalty } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CreditPenaltyRepository implements ICreditPenaltyRepository {
    readonly name = "CreditPenaltyRepository";

    async createPenalty(data: Omit<CreditPenalty, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPenalty> {
        try {
            const { collection, addDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            const docRef = await addDoc(collection(db, firebaseCollectionNames.creditPenalties || "creditPenalties"), {
                ...cleanData,
                dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate),
                paidAt: data.paidAt ? (data.paidAt instanceof Date ? data.paidAt : new Date(data.paidAt)) : undefined,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const created = await this.getPenaltyById(docRef.id);
            if (!created) {
                throw new Error("Erreur lors de la récupération de la pénalité créée");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création de la pénalité:", error);
            throw error;
        }
    }

    async getPenaltyById(id: string): Promise<CreditPenalty | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const penaltyRef = doc(db, firebaseCollectionNames.creditPenalties || "creditPenalties", id);
            const docSnap = await getDoc(penaltyRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...(data as any),
                dueDate: (data.dueDate as any)?.toDate ? (data.dueDate as any).toDate() : new Date(data.dueDate),
                paidAt: data.paidAt ? ((data.paidAt as any)?.toDate ? (data.paidAt as any).toDate() : new Date(data.paidAt)) : undefined,
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            } as CreditPenalty;
        } catch (error) {
            console.error("Erreur lors de la récupération de la pénalité:", error);
            return null;
        }
    }

    async getAllPenalties(): Promise<CreditPenalty[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.creditPenalties || "creditPenalties"),
                orderBy("dueDate", "desc")
            );

            const querySnapshot = await getDocs(q);
            const penalties: CreditPenalty[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                penalties.push({
                    id: doc.id,
                    ...(data as any),
                    dueDate: (data.dueDate as any)?.toDate ? (data.dueDate as any).toDate() : new Date(data.dueDate),
                    paidAt: data.paidAt ? ((data.paidAt as any)?.toDate ? (data.paidAt as any).toDate() : new Date(data.paidAt)) : undefined,
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditPenalty);
            });

            return penalties;
        } catch (error) {
            console.error("Erreur lors de la récupération des pénalités:", error);
            return [];
        }
    }

    async getPenaltiesWithFilters(filters?: CreditPenaltyFilters): Promise<CreditPenalty[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.creditId) {
                constraints.push(where("creditId", "==", filters.creditId));
            }

            if (filters?.paid !== undefined) {
                constraints.push(where("paid", "==", filters.paid));
            }

            if (filters?.reported !== undefined) {
                constraints.push(where("reported", "==", filters.reported));
            }

            constraints.push(orderBy("dueDate", "desc"));

            const q = query(
                collection(db, firebaseCollectionNames.creditPenalties || "creditPenalties"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let penalties: CreditPenalty[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                penalties.push({
                    id: doc.id,
                    ...(data as any),
                    dueDate: (data.dueDate as any)?.toDate ? (data.dueDate as any).toDate() : new Date(data.dueDate),
                    paidAt: data.paidAt ? ((data.paidAt as any)?.toDate ? (data.paidAt as any).toDate() : new Date(data.paidAt)) : undefined,
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditPenalty);
            });

            // Filtrage côté client pour dates
            if (filters?.dueDateFrom) {
                penalties = penalties.filter((p) => p.dueDate >= filters.dueDateFrom!);
            }

            if (filters?.dueDateTo) {
                penalties = penalties.filter((p) => p.dueDate <= filters.dueDateTo!);
            }

            // Pagination
            if (filters?.page && filters?.limit) {
                const start = (filters.page - 1) * filters.limit;
                const end = start + filters.limit;
                penalties = penalties.slice(start, end);
            }

            return penalties;
        } catch (error) {
            console.error("Erreur lors de la récupération des pénalités filtrées:", error);
            return [];
        }
    }

    async getPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]> {
        return this.getPenaltiesWithFilters({ creditId });
    }

    async getUnpaidPenaltiesByCreditId(creditId: string): Promise<CreditPenalty[]> {
        return this.getPenaltiesWithFilters({ creditId, paid: false });
    }

    async getPenaltiesStats(filters?: CreditPenaltyFilters): Promise<CreditPenaltyStats> {
        try {
            const penalties = await this.getPenaltiesWithFilters(filters);

            const stats: CreditPenaltyStats = {
                total: penalties.length,
                paid: penalties.filter(p => p.paid).length,
                unpaid: penalties.filter(p => !p.paid).length,
                reported: penalties.filter(p => p.reported).length,
                totalAmount: penalties.reduce((sum, p) => sum + p.amount, 0),
                totalPaidAmount: penalties.filter(p => p.paid).reduce((sum, p) => sum + p.amount, 0),
                totalUnpaidAmount: penalties.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0),
            };

            return stats;
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                paid: 0,
                unpaid: 0,
                reported: 0,
                totalAmount: 0,
                totalPaidAmount: 0,
                totalUnpaidAmount: 0,
            };
        }
    }

    async updatePenalty(id: string, data: Partial<Omit<CreditPenalty, 'id' | 'createdAt'>>): Promise<CreditPenalty | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const penaltyRef = doc(db, firebaseCollectionNames.creditPenalties || "creditPenalties", id);

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            await updateDoc(penaltyRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getPenaltyById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la pénalité:", error);
            throw error;
        }
    }

    async deletePenalty(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const penaltyRef = doc(db, firebaseCollectionNames.creditPenalties || "creditPenalties", id);
            await deleteDoc(penaltyRef);
        } catch (error) {
            console.error("Erreur lors de la suppression de la pénalité:", error);
            throw error;
        }
    }
}

