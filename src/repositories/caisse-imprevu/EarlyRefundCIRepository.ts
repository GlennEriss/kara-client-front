import { IEarlyRefundCIRepository } from "./IEarlyRefundCIRepository";
import { EarlyRefundCI } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class EarlyRefundCIRepository implements IEarlyRefundCIRepository {
    readonly name = "EarlyRefundCIRepository";

    /**
     * Crée une nouvelle demande de retrait anticipé CI
     */
    async createEarlyRefund(
        contractId: string,
        data: Omit<EarlyRefundCI, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<EarlyRefundCI> {
        try {
            const { collection, addDoc, serverTimestamp, db } = await getFirestore();
            
            const earlyRefundsCollectionRef = collection(
                db,
                firebaseCollectionNames.contractsCI || "contractsCI",
                contractId,
                "earlyRefunds"
            );

            const docRef = await addDoc(earlyRefundsCollectionRef, {
                ...data,
                withdrawalDate: data.withdrawalDate instanceof Date 
                    ? data.withdrawalDate 
                    : new Date(data.withdrawalDate),
                deadlineAt: data.deadlineAt instanceof Date 
                    ? data.deadlineAt 
                    : new Date(data.deadlineAt),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const createdRefund = await this.getEarlyRefundById(contractId, docRef.id);
            if (!createdRefund) {
                throw new Error("Erreur lors de la récupération du retrait anticipé créé");
            }

            return createdRefund;
        } catch (error) {
            console.error("Erreur lors de la création du retrait anticipé:", error);
            throw error;
        }
    }

    /**
     * Récupère une demande de retrait anticipé par ID
     */
    async getEarlyRefundById(
        contractId: string,
        refundId: string
    ): Promise<EarlyRefundCI | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const refundRef = doc(
                db,
                firebaseCollectionNames.contractsCI || "contractsCI",
                contractId,
                "earlyRefunds",
                refundId
            );

            const docSnap = await getDoc(refundRef);

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data();

            return {
                id: docSnap.id,
                contractId,
                type: data.type || 'EARLY', // Utiliser le type stocké ou 'EARLY' par défaut
                reason: data.reason,
                withdrawalDate: data.withdrawalDate?.toDate ? data.withdrawalDate.toDate() : new Date(data.withdrawalDate),
                withdrawalTime: data.withdrawalTime,
                withdrawalAmount: data.withdrawalAmount,
                withdrawalMode: data.withdrawalMode,
                proofUrl: data.proofUrl,
                proofPath: data.proofPath,
                documentId: data.documentId,
                amountNominal: data.amountNominal,
                amountBonus: data.amountBonus,
                status: data.status,
                deadlineAt: data.deadlineAt?.toDate ? data.deadlineAt.toDate() : new Date(data.deadlineAt),
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
                approvedBy: data.approvedBy,
                approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : undefined,
                paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined,
            } as EarlyRefundCI;
        } catch (error) {
            console.error("Erreur lors de la récupération du retrait anticipé:", error);
            return null;
        }
    }

    /**
     * Récupère toutes les demandes de retrait anticipé d'un contrat
     */
    async getEarlyRefundsByContractId(
        contractId: string
    ): Promise<EarlyRefundCI[]> {
        try {
            const { collection, getDocs, query, orderBy, db } = await getFirestore();
            
            const earlyRefundsCollectionRef = collection(
                db,
                firebaseCollectionNames.contractsCI || "contractsCI",
                contractId,
                "earlyRefunds"
            );

            const q = query(earlyRefundsCollectionRef, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    contractId,
                    type: data.type || 'EARLY', // Utiliser le type stocké ou 'EARLY' par défaut
                    reason: data.reason,
                    withdrawalDate: data.withdrawalDate?.toDate ? data.withdrawalDate.toDate() : new Date(data.withdrawalDate),
                    withdrawalTime: data.withdrawalTime,
                    withdrawalAmount: data.withdrawalAmount,
                    withdrawalMode: data.withdrawalMode,
                    proofUrl: data.proofUrl,
                    proofPath: data.proofPath,
                    documentId: data.documentId,
                    amountNominal: data.amountNominal,
                    amountBonus: data.amountBonus,
                    status: data.status,
                    deadlineAt: data.deadlineAt?.toDate ? data.deadlineAt.toDate() : new Date(data.deadlineAt),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                    approvedBy: data.approvedBy,
                    approvedAt: data.approvedAt?.toDate ? data.approvedAt.toDate() : undefined,
                    paidAt: data.paidAt?.toDate ? data.paidAt.toDate() : undefined,
                } as EarlyRefundCI;
            });
        } catch (error) {
            console.error("Erreur lors de la récupération des retraits anticipés:", error);
            return [];
        }
    }

    /**
     * Met à jour une demande de retrait anticipé
     */
    async updateEarlyRefund(
        contractId: string,
        refundId: string,
        updates: Partial<Omit<EarlyRefundCI, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<EarlyRefundCI | null> {
        try {
            const { doc, updateDoc, serverTimestamp, db } = await getFirestore();
            
            const refundRef = doc(
                db,
                firebaseCollectionNames.contractsCI || "contractsCI",
                contractId,
                "earlyRefunds",
                refundId
            );

            const updateData: any = {
                ...updates,
                updatedAt: serverTimestamp(),
            };

            // Gérer les dates si présentes
            if (updates.withdrawalDate) {
                updateData.withdrawalDate = updates.withdrawalDate instanceof Date 
                    ? updates.withdrawalDate 
                    : new Date(updates.withdrawalDate);
            }
            if (updates.deadlineAt) {
                updateData.deadlineAt = updates.deadlineAt instanceof Date 
                    ? updates.deadlineAt 
                    : new Date(updates.deadlineAt);
            }
            if (updates.approvedAt) {
                updateData.approvedAt = updates.approvedAt instanceof Date 
                    ? updates.approvedAt 
                    : new Date(updates.approvedAt);
            }
            if (updates.paidAt) {
                updateData.paidAt = updates.paidAt instanceof Date 
                    ? updates.paidAt 
                    : new Date(updates.paidAt);
            }

            await updateDoc(refundRef, updateData);

            return await this.getEarlyRefundById(contractId, refundId);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du retrait anticipé:", error);
            throw error;
        }
    }

    /**
     * Supprime une demande de retrait anticipé (soft delete via statut ARCHIVED)
     */
    async deleteEarlyRefund(
        contractId: string,
        refundId: string
    ): Promise<void> {
        try {
            await this.updateEarlyRefund(contractId, refundId, { status: 'ARCHIVED' });
        } catch (error) {
            console.error("Erreur lors de la suppression du retrait anticipé:", error);
            throw error;
        }
    }
}

