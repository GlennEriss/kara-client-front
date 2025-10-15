import { IContractCIRepository } from "./IContractCIRepository";
import { ContractCI } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class ContractCIRepository implements IContractCIRepository {
    readonly name = "ContractCIRepository";

    /**
     * Crée un nouveau contrat CI avec un ID personnalisé
     * @param {Omit<ContractCI, 'createdAt' | 'updatedAt'>} data - Données du contrat (incluant l'ID personnalisé)
     * @returns {Promise<ContractCI>} - Le contrat créé
     */
    async createContract(data: Omit<ContractCI, 'createdAt' | 'updatedAt'>): Promise<ContractCI> {
        try {
            const { doc, setDoc, db, serverTimestamp } = await getFirestore();

            // Utiliser l'ID fourni dans data
            const contractRef = doc(db, firebaseCollectionNames.contractsCI || "contractsCI", data.id);

            await setDoc(contractRef, {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // Récupérer le contrat créé
            const createdContract = await this.getContractById(data.id);
            
            if (!createdContract) {
                throw new Error("Erreur lors de la récupération du contrat créé");
            }

            return createdContract;

        } catch (error) {
            console.error("Erreur lors de la création du contrat CI:", error);
            throw error;
        }
    }

    /**
     * Récupère un contrat par son ID
     * @param {string} id - L'ID du contrat
     * @returns {Promise<ContractCI | null>} - Le contrat trouvé ou null
     */
    async getContractById(id: string): Promise<ContractCI | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const contractRef = doc(db, firebaseCollectionNames.contractsCI || "contractsCI", id);
            const docSnap = await getDoc(contractRef);
            
            if (!docSnap.exists()) {
                console.log(`Contrat CI non trouvé avec l'ID: ${id}`);
                return null;
            }
            
            const data = docSnap.data();
            
            const contract: ContractCI = {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
            };
            
            return contract;

        } catch (error) {
            console.error("Erreur lors de la récupération du contrat CI par ID:", error);
            return null;
        }
    }

    /**
     * Récupère tous les contrats CI
     * @returns {Promise<ContractCI[]>} - Liste de tous les contrats
     */
    async getAllContracts(): Promise<ContractCI[]> {
        try {
            const { collection, db, getDocs, query, orderBy } = await getFirestore();

            // Requête pour récupérer tous les contrats, triés par date de création décroissante
            const q = query(
                collection(db, firebaseCollectionNames.contractsCI || "contractsCI"),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const contracts: ContractCI[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const contract: ContractCI = {
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                };

                contracts.push(contract);
            });

            return contracts;

        } catch (error) {
            console.error("Erreur lors de la récupération des contrats CI:", error);
            return [];
        }
    }

    /**
     * Met à jour un contrat existant
     * @param {string} id - L'ID du contrat
     * @param {Partial<Omit<ContractCI, 'id' | 'createdAt'>>} data - Données à mettre à jour
     * @returns {Promise<ContractCI | null>} - Le contrat mis à jour ou null
     */
    async updateContract(id: string, data: Partial<Omit<ContractCI, 'id' | 'createdAt'>>): Promise<ContractCI | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const contractRef = doc(db, firebaseCollectionNames.contractsCI || "contractsCI", id);

            await updateDoc(contractRef, {
                ...data,
                updatedAt: serverTimestamp(),
            });

            // Récupérer le contrat mis à jour
            return await this.getContractById(id);

        } catch (error) {
            console.error("Erreur lors de la mise à jour du contrat CI:", error);
            throw error;
        }
    }

    /**
     * Supprime un contrat
     * @param {string} id - L'ID du contrat à supprimer
     * @returns {Promise<void>}
     */
    async deleteContract(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();

            const contractRef = doc(db, firebaseCollectionNames.contractsCI || "contractsCI", id);
            await deleteDoc(contractRef);

            console.log(`Contrat CI ${id} supprimé avec succès`);

        } catch (error) {
            console.error("Erreur lors de la suppression du contrat CI:", error);
            throw error;
        }
    }
}

