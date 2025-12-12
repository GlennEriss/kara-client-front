import { IGuarantorRemunerationRepository, GuarantorRemunerationFilters, GuarantorRemunerationStats } from "./IGuarantorRemunerationRepository";
import { GuarantorRemuneration } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class GuarantorRemunerationRepository implements IGuarantorRemunerationRepository {
    readonly name = "GuarantorRemunerationRepository";

    async createRemuneration(data: Omit<GuarantorRemuneration, 'id' | 'createdAt' | 'updatedAt'>): Promise<GuarantorRemuneration> {
        try {
            const { collection, addDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            const docRef = await addDoc(collection(db, firebaseCollectionNames.guarantorRemunerations || "guarantorRemunerations"), {
                ...cleanData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const created = await this.getRemunerationById(docRef.id);
            if (!created) {
                throw new Error("Erreur lors de la récupération de la rémunération créée");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création de la rémunération:", error);
            throw error;
        }
    }

    async getRemunerationById(id: string): Promise<GuarantorRemuneration | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const remunerationRef = doc(db, firebaseCollectionNames.guarantorRemunerations || "guarantorRemunerations", id);
            const docSnap = await getDoc(remunerationRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            } as GuarantorRemuneration;
        } catch (error) {
            console.error("Erreur lors de la récupération de la rémunération:", error);
            return null;
        }
    }

    async getAllRemunerations(): Promise<GuarantorRemuneration[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.guarantorRemunerations || "guarantorRemunerations"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const remunerations: GuarantorRemuneration[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                remunerations.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as GuarantorRemuneration);
            });

            return remunerations;
        } catch (error) {
            console.error("Erreur lors de la récupération des rémunérations:", error);
            return [];
        }
    }

    async getRemunerationsWithFilters(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemuneration[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const constraints: any[] = [];
            
            if (filters?.creditId) {
                constraints.push(where("creditId", "==", filters.creditId));
            }
            if (filters?.guarantorId) {
                constraints.push(where("guarantorId", "==", filters.guarantorId));
            }
            if (filters?.paymentId) {
                constraints.push(where("paymentId", "==", filters.paymentId));
            }
            if (filters?.month !== undefined) {
                constraints.push(where("month", "==", filters.month));
            }

            constraints.push(orderBy("createdAt", "desc"));

            const q = query(
                collection(db, firebaseCollectionNames.guarantorRemunerations || "guarantorRemunerations"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            const remunerations: GuarantorRemuneration[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                remunerations.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                } as GuarantorRemuneration);
            });

            return remunerations;
        } catch (error) {
            console.error("Erreur lors de la récupération des rémunérations avec filtres:", error);
            return [];
        }
    }

    async getRemunerationsByCreditId(creditId: string): Promise<GuarantorRemuneration[]> {
        return this.getRemunerationsWithFilters({ creditId });
    }

    async getRemunerationsByGuarantorId(guarantorId: string): Promise<GuarantorRemuneration[]> {
        return this.getRemunerationsWithFilters({ guarantorId });
    }

    async getRemunerationsByPaymentId(paymentId: string): Promise<GuarantorRemuneration[]> {
        return this.getRemunerationsWithFilters({ paymentId });
    }

    async getRemunerationsStats(filters?: GuarantorRemunerationFilters): Promise<GuarantorRemunerationStats> {
        try {
            const remunerations = await this.getRemunerationsWithFilters(filters);
            
            const stats: GuarantorRemunerationStats = {
                total: remunerations.length,
                totalAmount: remunerations.reduce((sum, r) => sum + r.amount, 0),
                byGuarantor: {},
            };

            remunerations.forEach((r) => {
                if (!stats.byGuarantor[r.guarantorId]) {
                    stats.byGuarantor[r.guarantorId] = 0;
                }
                stats.byGuarantor[r.guarantorId] += r.amount;
            });

            return stats;
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                totalAmount: 0,
                byGuarantor: {},
            };
        }
    }

    async updateRemuneration(id: string, data: Partial<Omit<GuarantorRemuneration, 'id' | 'createdAt'>>): Promise<GuarantorRemuneration | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            const remunerationRef = doc(db, firebaseCollectionNames.guarantorRemunerations || "guarantorRemunerations", id);
            await updateDoc(remunerationRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getRemunerationById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la rémunération:", error);
            return null;
        }
    }

    async deleteRemuneration(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();
            const remunerationRef = doc(db, firebaseCollectionNames.guarantorRemunerations || "guarantorRemunerations", id);
            await deleteDoc(remunerationRef);
        } catch (error) {
            console.error("Erreur lors de la suppression de la rémunération:", error);
            throw error;
        }
    }
}

