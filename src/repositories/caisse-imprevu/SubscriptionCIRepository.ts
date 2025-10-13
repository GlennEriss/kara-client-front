import { ISubscriptionCIRepository } from "./ISubscriptionCIRepository";
import { SubscriptionCI } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class SubscriptionCIRepository implements ISubscriptionCIRepository {
    readonly name = "SubscriptionCIRepository";

    /**
     * Récupère toutes les souscriptions de la Caisse Imprévue
     * @returns {Promise<SubscriptionCI[]>} - Liste de toutes les souscriptions
     */
    async getAllSubscriptions(): Promise<SubscriptionCI[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            // Requête pour récupérer toutes les souscriptions, triées par date de création décroissante
            const q = query(
                collection(db, firebaseCollectionNames.subscriptionsCI || "subscriptionsCI"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const subscriptions: SubscriptionCI[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const subscription: SubscriptionCI = {
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                };

                subscriptions.push(subscription);
            });

            return subscriptions;

        } catch (error) {
            console.error("Erreur lors de la récupération des souscriptions CI:", error);
            return [];
        }
    }

    /**
     * Récupère une souscription par son ID
     * @param {string} id - L'ID de la souscription
     * @returns {Promise<SubscriptionCI | null>} - La souscription trouvée ou null
     */
    async getSubscriptionById(id: string): Promise<SubscriptionCI | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const subscriptionRef = doc(db, firebaseCollectionNames.subscriptionsCI || "subscriptionsCI", id);
            const docSnap = await getDoc(subscriptionRef);
            
            if (!docSnap.exists()) {
                console.log(`Souscription CI non trouvée avec l'ID: ${id}`);
                return null;
            }
            
            const data = docSnap.data();
            
            const subscription: SubscriptionCI = {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            };
            
            return subscription;

        } catch (error) {
            console.error("Erreur lors de la récupération de la souscription CI par ID:", error);
            return null;
        }
    }

    /**
     * Crée une nouvelle souscription
     * @param {Omit<SubscriptionCI, 'id' | 'createdAt' | 'updatedAt'>} data - Données de la souscription
     * @returns {Promise<SubscriptionCI>} - La souscription créée
     */
    async createSubscription(data: Omit<SubscriptionCI, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionCI> {
        try {
            const { collection, db, addDoc, serverTimestamp } = await getFirestore();

            const docRef = await addDoc(collection(db, firebaseCollectionNames.subscriptionsCI || "subscriptionsCI"), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Récupérer la souscription créée
            const createdSubscription = await this.getSubscriptionById(docRef.id);
            
            if (!createdSubscription) {
                throw new Error("Erreur lors de la récupération de la souscription créée");
            }

            return createdSubscription;

        } catch (error) {
            console.error("Erreur lors de la création de la souscription CI:", error);
            throw error;
        }
    }

    /**
     * Met à jour une souscription existante
     * @param {string} id - L'ID de la souscription
     * @param {Partial<Omit<SubscriptionCI, 'id' | 'createdAt'>>} data - Données à mettre à jour
     * @returns {Promise<SubscriptionCI | null>} - La souscription mise à jour ou null
     */
    async updateSubscription(id: string, data: Partial<Omit<SubscriptionCI, 'id' | 'createdAt'>>): Promise<SubscriptionCI | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const subscriptionRef = doc(db, firebaseCollectionNames.subscriptionsCI || "subscriptionsCI", id);

            await updateDoc(subscriptionRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            // Récupérer la souscription mise à jour
            return await this.getSubscriptionById(id);

        } catch (error) {
            console.error("Erreur lors de la mise à jour de la souscription CI:", error);
            throw error;
        }
    }

    /**
     * Supprime une souscription
     * @param {string} id - L'ID de la souscription à supprimer
     * @returns {Promise<void>}
     */
    async deleteSubscription(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const subscriptionRef = doc(db, firebaseCollectionNames.subscriptionsCI || "subscriptionsCI", id);
            await deleteDoc(subscriptionRef);

            console.log(`Souscription CI ${id} supprimée avec succès`);

        } catch (error) {
            console.error("Erreur lors de la suppression de la souscription CI:", error);
            throw error;
        }
    }
}