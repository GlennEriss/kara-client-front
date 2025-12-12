import { ICreditPaymentRepository, CreditPaymentFilters, CreditPaymentStats } from "./ICreditPaymentRepository";
import { CreditPayment } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CreditPaymentRepository implements ICreditPaymentRepository {
    readonly name = "CreditPaymentRepository";

    async createPayment(data: Omit<CreditPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreditPayment> {
        try {
            const { collection, addDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            const docRef = await addDoc(collection(db, firebaseCollectionNames.creditPayments || "creditPayments"), {
                ...cleanData,
                paymentDate: data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const created = await this.getPaymentById(docRef.id);
            if (!created) {
                throw new Error("Erreur lors de la récupération du paiement créé");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création du paiement:", error);
            throw error;
        }
    }

    async getPaymentById(id: string): Promise<CreditPayment | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const paymentRef = doc(db, firebaseCollectionNames.creditPayments || "creditPayments", id);
            const docSnap = await getDoc(paymentRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...(data as any),
                paymentDate: (data.paymentDate as any)?.toDate ? (data.paymentDate as any).toDate() : new Date(data.paymentDate),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            } as CreditPayment;
        } catch (error) {
            console.error("Erreur lors de la récupération du paiement:", error);
            return null;
        }
    }

    async getAllPayments(): Promise<CreditPayment[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.creditPayments || "creditPayments"),
                orderBy("paymentDate", "desc")
            );

            const querySnapshot = await getDocs(q);
            const payments: CreditPayment[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                payments.push({
                    id: doc.id,
                    ...(data as any),
                    paymentDate: (data.paymentDate as any)?.toDate ? (data.paymentDate as any).toDate() : new Date(data.paymentDate),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditPayment);
            });

            return payments;
        } catch (error) {
            console.error("Erreur lors de la récupération des paiements:", error);
            return [];
        }
    }

    async getPaymentsWithFilters(filters?: CreditPaymentFilters): Promise<CreditPayment[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.creditId) {
                constraints.push(where("creditId", "==", filters.creditId));
            }

            if (filters?.mode && filters.mode !== 'all') {
                constraints.push(where("mode", "==", filters.mode));
            }

            const orderByField = filters?.orderByField || "paymentDate";
            const orderByDirection = filters?.orderByDirection || "desc";
            constraints.push(orderBy(orderByField, orderByDirection));

            const q = query(
                collection(db, firebaseCollectionNames.creditPayments || "creditPayments"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let payments: CreditPayment[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                payments.push({
                    id: doc.id,
                    ...(data as any),
                    paymentDate: (data.paymentDate as any)?.toDate ? (data.paymentDate as any).toDate() : new Date(data.paymentDate),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as CreditPayment);
            });

            // Filtrage côté client pour dates
            if (filters?.paymentDateFrom) {
                payments = payments.filter((p) => p.paymentDate >= filters.paymentDateFrom!);
            }

            if (filters?.paymentDateTo) {
                payments = payments.filter((p) => p.paymentDate <= filters.paymentDateTo!);
            }

            // Pagination
            if (filters?.page && filters?.limit) {
                const start = (filters.page - 1) * filters.limit;
                const end = start + filters.limit;
                payments = payments.slice(start, end);
            }

            return payments;
        } catch (error) {
            console.error("Erreur lors de la récupération des paiements filtrés:", error);
            return [];
        }
    }

    async getPaymentsByCreditId(creditId: string): Promise<CreditPayment[]> {
        return this.getPaymentsWithFilters({ creditId });
    }

    async getPaymentsStats(filters?: CreditPaymentFilters): Promise<CreditPaymentStats> {
        try {
            const payments = await this.getPaymentsWithFilters(filters);

            const stats: CreditPaymentStats = {
                total: payments.length,
                totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
                byMode: {
                    cash: payments.filter(p => p.mode === 'CASH').reduce((sum, p) => sum + p.amount, 0),
                    mobile_money: payments.filter(p => p.mode === 'MOBILE_MONEY').reduce((sum, p) => sum + p.amount, 0),
                    bank_transfer: payments.filter(p => p.mode === 'BANK_TRANSFER').reduce((sum, p) => sum + p.amount, 0),
                    cheque: payments.filter(p => p.mode === 'CHEQUE').reduce((sum, p) => sum + p.amount, 0),
                },
            };

            return stats;
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                totalAmount: 0,
                byMode: { cash: 0, mobile_money: 0, bank_transfer: 0, cheque: 0 },
            };
        }
    }

    async updatePayment(id: string, data: Partial<Omit<CreditPayment, 'id' | 'createdAt'>>): Promise<CreditPayment | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const paymentRef = doc(db, firebaseCollectionNames.creditPayments || "creditPayments", id);

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            await updateDoc(paymentRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getPaymentById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du paiement:", error);
            throw error;
        }
    }

    async deletePayment(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const paymentRef = doc(db, firebaseCollectionNames.creditPayments || "creditPayments", id);
            await deleteDoc(paymentRef);
        } catch (error) {
            console.error("Erreur lors de la suppression du paiement:", error);
            throw error;
        }
    }
}

