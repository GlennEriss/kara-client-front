import { ICreditInstallmentRepository, CreditInstallmentFilters, CreditInstallmentStats } from "./ICreditInstallmentRepository";
import { CreditInstallment } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CreditInstallmentRepository implements ICreditInstallmentRepository {
    readonly name = "CreditInstallmentRepository";

    async createInstallment(data: Omit<CreditInstallment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditInstallment> {
        try {
            const { collection, addDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            const docData: any = {
                ...cleanData,
                dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            // Ne pas inclure paidAt s'il est undefined
            if (data.paidAt) {
                docData.paidAt = data.paidAt instanceof Date ? data.paidAt : new Date(data.paidAt);
            }

            const docRef = await addDoc(collection(db, firebaseCollectionNames.creditInstallments || "creditInstallments"), docData);

            const created = await this.getInstallmentById(docRef.id);
            if (!created) {
                throw new Error("Erreur lors de la récupération de l'échéance créée");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création de l'échéance:", error);
            throw error;
        }
    }

    async createInstallments(data: Array<Omit<CreditInstallment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CreditInstallment[]> {
        try {
            const { collection, doc, db, serverTimestamp, writeBatch } = await getFirestore();
            const batch = writeBatch(db);
            const collectionRef = collection(db, firebaseCollectionNames.creditInstallments || "creditInstallments");
            const createdIds: string[] = [];

            data.forEach((item) => {
                const docRef = doc(collectionRef);
                createdIds.push(docRef.id);

                const batchData: any = {
                    creditId: item.creditId,
                    installmentNumber: item.installmentNumber,
                    dueDate: item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate),
                    principalAmount: item.principalAmount,
                    interestAmount: item.interestAmount,
                    totalAmount: item.totalAmount,
                    paidAmount: item.paidAmount,
                    remainingAmount: item.remainingAmount,
                    status: item.status,
                    createdBy: item.createdBy,
                    updatedBy: item.updatedBy,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                // Ne pas inclure paidAt s'il est undefined ou null
                if (item.paidAt !== undefined && item.paidAt !== null) {
                    batchData.paidAt = item.paidAt instanceof Date ? item.paidAt : new Date(item.paidAt);
                }

                // Ne pas inclure paymentId s'il est undefined ou null
                if (item.paymentId !== undefined && item.paymentId !== null) {
                    batchData.paymentId = item.paymentId;
                }

                batch.set(docRef, batchData);
            });

            await batch.commit();

            // Récupérer les échéances créées
            const created: CreditInstallment[] = [];
            for (const id of createdIds) {
                const installment = await this.getInstallmentById(id);
                if (installment) {
                    created.push(installment);
                }
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création des échéances:", error);
            throw error;
        }
    }

    async getInstallmentById(id: string): Promise<CreditInstallment | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const installmentRef = doc(db, firebaseCollectionNames.creditInstallments || "creditInstallments", id);
            const docSnap = await getDoc(installmentRef);
            
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
            } as CreditInstallment;
        } catch (error) {
            console.error("Erreur lors de la récupération de l'échéance:", error);
            return null;
        }
    }

    async getAllInstallments(): Promise<CreditInstallment[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.creditInstallments || "creditInstallments"),
                orderBy("dueDate", "asc")
            );

            const querySnapshot = await getDocs(q);
            const installments: CreditInstallment[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                installments.push({
                    id: doc.id,
                    ...(data as any),
                    dueDate: (data.dueDate as any)?.toDate ? (data.dueDate as any).toDate() : new Date(data.dueDate),
                    paidAt: data.paidAt ? ((data.paidAt as any)?.toDate ? (data.paidAt as any).toDate() : new Date(data.paidAt)) : undefined,
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditInstallment);
            });

            return installments;
        } catch (error) {
            console.error("Erreur lors de la récupération des échéances:", error);
            return [];
        }
    }

    async getInstallmentsWithFilters(filters?: CreditInstallmentFilters): Promise<CreditInstallment[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.creditId) {
                constraints.push(where("creditId", "==", filters.creditId));
            }

            if (filters?.status) {
                constraints.push(where("status", "==", filters.status));
            }

            const orderByField = filters?.orderByField || "dueDate";
            const orderByDirection = filters?.orderByDirection || "asc";
            constraints.push(orderBy(orderByField, orderByDirection));

            const q = query(
                collection(db, firebaseCollectionNames.creditInstallments || "creditInstallments"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let installments: CreditInstallment[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                installments.push({
                    id: doc.id,
                    ...(data as any),
                    dueDate: (data.dueDate as any)?.toDate ? (data.dueDate as any).toDate() : new Date(data.dueDate),
                    paidAt: data.paidAt ? ((data.paidAt as any)?.toDate ? (data.paidAt as any).toDate() : new Date(data.paidAt)) : undefined,
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditInstallment);
            });

            // Filtrage côté client pour dates
            if (filters?.dueDateFrom) {
                installments = installments.filter((i) => i.dueDate >= filters.dueDateFrom!);
            }

            if (filters?.dueDateTo) {
                installments = installments.filter((i) => i.dueDate <= filters.dueDateTo!);
            }

            // Pagination
            if (filters?.page && filters?.limit) {
                const start = (filters.page - 1) * filters.limit;
                const end = start + filters.limit;
                installments = installments.slice(start, end);
            }

            return installments;
        } catch (error) {
            console.error("Erreur lors de la récupération des échéances filtrées:", error);
            return [];
        }
    }

    async getInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]> {
        return this.getInstallmentsWithFilters({ creditId, orderByField: "installmentNumber", orderByDirection: "asc" });
    }

    async getPendingInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]> {
        return this.getInstallmentsWithFilters({ creditId, status: 'PENDING' });
    }

    async getOverdueInstallmentsByCreditId(creditId: string): Promise<CreditInstallment[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return this.getInstallmentsWithFilters({ creditId, dueDateTo: now }).then(installments => 
            installments.filter(i => i.status !== 'PAID' && i.dueDate < now)
        );
    }

    async getNextDueInstallment(creditId: string): Promise<CreditInstallment | null> {
        const installments = await this.getInstallmentsByCreditId(creditId);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        // Inclure aussi les échéances PARTIAL (partiellement payées) pour permettre de continuer à payer
        const pendingOrDue = installments.filter(i =>
            (i.status === 'PENDING' || i.status === 'DUE' || i.status === 'OVERDUE' || i.status === 'PARTIAL') &&
            i.remainingAmount > 0
        );
        
        if (pendingOrDue.length === 0) return null;
        
        // Retourner la première échéance non payée (triée par dueDate)
        return pendingOrDue[0];
    }

    async getInstallmentsStats(filters?: CreditInstallmentFilters): Promise<CreditInstallmentStats> {
        try {
            const installments = await this.getInstallmentsWithFilters(filters);

            const stats: CreditInstallmentStats = {
                total: installments.length,
                pending: installments.filter(i => i.status === 'PENDING').length,
                due: installments.filter(i => i.status === 'DUE').length,
                partial: installments.filter(i => i.status === 'PARTIAL').length,
                paid: installments.filter(i => i.status === 'PAID').length,
                overdue: installments.filter(i => i.status === 'OVERDUE').length,
                totalAmount: installments.reduce((sum, i) => sum + i.totalAmount, 0),
                paidAmount: installments.reduce((sum, i) => sum + i.paidAmount, 0),
                remainingAmount: installments.reduce((sum, i) => sum + i.remainingAmount, 0),
            };

            return stats;
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                pending: 0,
                due: 0,
                partial: 0,
                paid: 0,
                overdue: 0,
                totalAmount: 0,
                paidAmount: 0,
                remainingAmount: 0,
            };
        }
    }

    async updateInstallment(id: string, data: Partial<Omit<CreditInstallment, 'id' | 'createdAt'>>): Promise<CreditInstallment | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const installmentRef = doc(db, firebaseCollectionNames.creditInstallments || "creditInstallments", id);

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Gérer les dates
            if (cleanData.dueDate) {
                cleanData.dueDate = cleanData.dueDate instanceof Date ? cleanData.dueDate : new Date(cleanData.dueDate);
            }
            if (cleanData.paidAt) {
                cleanData.paidAt = cleanData.paidAt instanceof Date ? cleanData.paidAt : new Date(cleanData.paidAt);
            }

            await updateDoc(installmentRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getInstallmentById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'échéance:", error);
            throw error;
        }
    }

    async deleteInstallment(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const installmentRef = doc(db, firebaseCollectionNames.creditInstallments || "creditInstallments", id);
            await deleteDoc(installmentRef);
        } catch (error) {
            console.error("Erreur lors de la suppression de l'échéance:", error);
            throw error;
        }
    }

    async deleteInstallmentsByCreditId(creditId: string): Promise<void> {
        try {
            const installments = await this.getInstallmentsByCreditId(creditId);
            const { doc, deleteDoc, db } = await getFirestore();

            for (const installment of installments) {
                const installmentRef = doc(db, firebaseCollectionNames.creditInstallments || "creditInstallments", installment.id);
                await deleteDoc(installmentRef);
            }
        } catch (error) {
            console.error("Erreur lors de la suppression des échéances:", error);
            throw error;
        }
    }
}

