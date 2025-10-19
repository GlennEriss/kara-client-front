import { IPaymentCIRepository } from "./IPaymentCIRepository";
import { PaymentCI, VersementCI } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class PaymentCIRepository implements IPaymentCIRepository {
    readonly name = "PaymentCIRepository";

    /**
     * Récupère un paiement par contractId et monthIndex
     */
    async getPaymentByMonth(contractId: string, monthIndex: number): Promise<PaymentCI | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const paymentId = `month-${monthIndex}`;
            const paymentRef = doc(
                db, 
                firebaseCollectionNames.contractsCI || "contractsCI", 
                contractId, 
                "payments", 
                paymentId
            );
            
            const docSnap = await getDoc(paymentRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            
            return {
                id: docSnap.id,
                contractId,
                monthIndex: data.monthIndex,
                status: data.status,
                targetAmount: data.targetAmount,
                accumulatedAmount: data.accumulatedAmount,
                versements: data.versements?.map((v: any) => ({
                    ...v,
                    createdAt: v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt)
                })) || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
            } as PaymentCI;
        } catch (error) {
            console.error(`Erreur lors de la récupération du paiement mois ${monthIndex}:`, error);
            return null;
        }
    }

    /**
     * Récupère tous les paiements d'un contrat
     */
    async getPaymentsByContractId(contractId: string): Promise<PaymentCI[]> {
        try {
            const { collection, getDocs, db } = await getFirestore();
            
            const paymentsCollectionRef = collection(
                db, 
                firebaseCollectionNames.contractsCI || "contractsCI", 
                contractId, 
                "payments"
            );
            
            const snapshot = await getDocs(paymentsCollectionRef);
            
            return snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    contractId,
                    monthIndex: data.monthIndex,
                    status: data.status,
                    targetAmount: data.targetAmount,
                    accumulatedAmount: data.accumulatedAmount,
                    versements: data.versements?.map((v: any) => ({
                        ...v,
                        createdAt: v.createdAt?.toDate ? v.createdAt.toDate() : new Date(v.createdAt)
                    })) || [],
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
                    createdBy: data.createdBy,
                    updatedBy: data.updatedBy,
                } as PaymentCI;
            });
        } catch (error) {
            console.error("Erreur lors de la récupération des paiements:", error);
            return [];
        }
    }

    /**
     * Crée un nouveau paiement (document mois)
     */
    async createPayment(contractId: string, data: Omit<PaymentCI, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentCI> {
        try {
            const { doc, setDoc, db, serverTimestamp } = await getFirestore();
            
            const paymentId = `month-${data.monthIndex}`;
            const paymentRef = doc(
                db, 
                firebaseCollectionNames.contractsCI || "contractsCI", 
                contractId, 
                "payments", 
                paymentId
            );

            await setDoc(paymentRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Récupérer le paiement créé
            const createdPayment = await this.getPaymentByMonth(contractId, data.monthIndex);
            
            if (!createdPayment) {
                throw new Error("Erreur lors de la récupération du paiement créé");
            }

            return createdPayment;
        } catch (error) {
            console.error("Erreur lors de la création du paiement:", error);
            throw error;
        }
    }

    /**
     * Ajoute un versement à un paiement existant
     */
    async addVersement(contractId: string, monthIndex: number, versement: VersementCI, userId: string): Promise<PaymentCI> {
        try {
            const { doc, updateDoc, arrayUnion, db, serverTimestamp, increment } = await getFirestore();
            
            const paymentId = `month-${monthIndex}`;
            const paymentRef = doc(
                db, 
                firebaseCollectionNames.contractsCI || "contractsCI", 
                contractId, 
                "payments", 
                paymentId
            );

            // Convertir la date createdAt en timestamp Firestore pour le stockage
            const versementToStore = {
                ...versement,
                createdAt: new Date(versement.createdAt)
            };

            await updateDoc(paymentRef, {
                versements: arrayUnion(versementToStore),
                accumulatedAmount: increment(versement.amount),
                updatedAt: serverTimestamp(),
                updatedBy: userId,
            });

            // Récupérer le paiement mis à jour
            const updatedPayment = await this.getPaymentByMonth(contractId, monthIndex);
            
            if (!updatedPayment) {
                throw new Error("Erreur lors de la récupération du paiement mis à jour");
            }

            // Calculer et mettre à jour le statut
            const newStatus = updatedPayment.accumulatedAmount >= updatedPayment.targetAmount ? 'PAID' : 'PARTIAL';
            
            if (newStatus !== updatedPayment.status) {
                await this.updatePaymentStatus(contractId, monthIndex, updatedPayment.accumulatedAmount, newStatus, userId);
                updatedPayment.status = newStatus;
            }

            return updatedPayment;
        } catch (error) {
            console.error("Erreur lors de l'ajout du versement:", error);
            throw error;
        }
    }

    /**
     * Met à jour le statut et le montant accumulé d'un paiement
     */
    async updatePaymentStatus(contractId: string, monthIndex: number, accumulatedAmount: number, status: 'DUE' | 'PAID' | 'PARTIAL', userId: string): Promise<PaymentCI | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();
            
            const paymentId = `month-${monthIndex}`;
            const paymentRef = doc(
                db, 
                firebaseCollectionNames.contractsCI || "contractsCI", 
                contractId, 
                "payments", 
                paymentId
            );

            await updateDoc(paymentRef, {
                accumulatedAmount,
                status,
                updatedAt: serverTimestamp(),
                updatedBy: userId,
            });

            return await this.getPaymentByMonth(contractId, monthIndex);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du statut du paiement:", error);
            return null;
        }
    }
}

