import { IGuarantorPaymentRepository } from "./IGuarantorPaymentRepository";
import { GuarantorPayment } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");
const COLLECTION = firebaseCollectionNames.guarantorPayments || "guarantorPayments";

function toGuarantorPayment(doc: any): GuarantorPayment {
    const data = doc.data();
    return {
        id: doc.id,
        creditId: data.creditId,
        guarantorId: data.guarantorId,
        paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : new Date(data.paymentDate),
        paymentTime: data.paymentTime ?? "",
        amount: data.amount ?? 0,
        mode: data.mode ?? "airtel_money",
        proofUrl: data.proofUrl,
        proofPath: data.proofPath,
        reference: data.reference,
        comment: data.comment,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
    } as GuarantorPayment;
}

export class GuarantorPaymentRepository implements IGuarantorPaymentRepository {
    readonly name = "GuarantorPaymentRepository";

    async createPayment(data: Omit<GuarantorPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<GuarantorPayment> {
        const { collection, addDoc, db, serverTimestamp } = await getFirestore();

        const cleanData: any = {
            ...data,
            paymentDate: data.paymentDate instanceof Date ? data.paymentDate : new Date(data.paymentDate),
        };
        Object.keys(cleanData).forEach((key) => {
            if (cleanData[key] === undefined) {
                delete cleanData[key];
            }
        });

        const docRef = await addDoc(collection(db, COLLECTION), {
            ...cleanData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        const created = await this.getPaymentById(docRef.id);
        if (!created) {
            throw new Error("Erreur lors de la récupération du paiement garant créé");
        }
        return created;
    }

    async getPaymentById(id: string): Promise<GuarantorPayment | null> {
        const { doc, getDoc, db } = await getFirestore();
        const ref = doc(db, COLLECTION, id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        return toGuarantorPayment(snap);
    }

    async getPaymentsByCreditId(creditId: string): Promise<GuarantorPayment[]> {
        const { collection, query, where, orderBy, getDocs, db } = await getFirestore();
        const q = query(
            collection(db, COLLECTION),
            where("creditId", "==", creditId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => toGuarantorPayment(d));
    }

    async getPaymentsByGuarantorId(guarantorId: string): Promise<GuarantorPayment[]> {
        const { collection, query, where, orderBy, getDocs, db } = await getFirestore();
        const q = query(
            collection(db, COLLECTION),
            where("guarantorId", "==", guarantorId),
            orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => toGuarantorPayment(d));
    }
}
