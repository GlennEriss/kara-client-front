import { IContractCIRepository, ContractsCIFilters, ContractsCIStats } from "./IContractCIRepository";
import { ContractCI } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class ContractCIRepository implements IContractCIRepository {
    readonly name = "ContractCIRepository";

    /**
     * Convertit firstPaymentDate (Firestore Timestamp, Date, string) en string YYYY-MM-DD
     */
    private toDateString(value: any): string {
        if (!value) return "";
        if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.split("T")[0];
        const date = value instanceof Date ? value : value?.toDate?.() ?? new Date(value);
        return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
    }

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

            // Nettoyer les valeurs undefined pour éviter les erreurs Firestore
            const cleanData: any = { ...data }
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key]
                }
            })

            await setDoc(contractRef, {
                ...cleanData,
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
                firstPaymentDate: this.toDateString(data.firstPaymentDate),
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
                    firstPaymentDate: this.toDateString(data.firstPaymentDate),
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
     * Récupère tous les contrats d'un membre spécifique
     * @param {string} memberId - L'ID du membre
     * @returns {Promise<ContractCI[]>} - Liste des contrats du membre
     */
    async getContractsByMemberId(memberId: string): Promise<ContractCI[]> {
        try {
            const { collection, db, getDocs, query, where, orderBy } = await getFirestore();

            const q = query(
                collection(db, firebaseCollectionNames.contractsCI || "contractsCI"),
                where("memberId", "==", memberId),
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
                    firstPaymentDate: this.toDateString(data.firstPaymentDate),
                };

                contracts.push(contract);
            });

            return contracts;

        } catch (error) {
            console.error("Erreur lors de la récupération des contrats CI du membre:", error);
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

            // Nettoyer les valeurs undefined pour éviter les erreurs Firestore
            const cleanData: any = { ...data }
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key]
                }
            })

            await updateDoc(contractRef, {
                ...cleanData,
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

    /**
     * Récupère les contrats avec filtres
     * @param {ContractsCIFilters} filters - Filtres à appliquer
     * @returns {Promise<ContractCI[]>} - Liste des contrats filtrés
     */
    async getContractsWithFilters(filters?: ContractsCIFilters): Promise<ContractCI[]> {
        try {
            const { collection, db, getDocs, query, orderBy, where } = await getFirestore();

            const constraints: any[] = [];
            
            // Filtrer par statut si spécifié
            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            // Filtrer par paymentFrequency si spécifié
            if (filters?.paymentFrequency && filters.paymentFrequency !== 'all') {
                constraints.push(where("paymentFrequency", "==", filters.paymentFrequency));
            }

            // Filtrer par catégorie/forfait si spécifié
            if (filters?.subscriptionCIID) {
                constraints.push(where("subscriptionCIID", "==", filters.subscriptionCIID));
            }

            // Toujours trier par date de création décroissante
            constraints.push(orderBy("createdAt", "desc"));

            const q = query(
                collection(db, firebaseCollectionNames.contractsCI || "contractsCI"),
                ...constraints
            );

            const querySnapshot = await getDocs(q);
            let contracts: ContractCI[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const contract: ContractCI = {
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    firstPaymentDate: this.toDateString(data.firstPaymentDate),
                };

                contracts.push(contract);
            });

            // Filtrer par recherche côté client (pour rechercher dans les noms)
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase();
                contracts = contracts.filter(c =>
                    c.id.toLowerCase().includes(searchLower) ||
                    c.memberFirstName?.toLowerCase().includes(searchLower) ||
                    c.memberLastName?.toLowerCase().includes(searchLower) ||
                    c.subscriptionCICode?.toLowerCase().includes(searchLower) ||
                    c.subscriptionCILabel?.toLowerCase().includes(searchLower) ||
                    c.memberContacts?.some(contact => contact.toLowerCase().includes(searchLower))
                );
            }

            // Filtrer par retard de paiement si demandé
            if (filters?.overdueOnly) {
                contracts = await this.filterOverdueContracts(contracts);
            }

            return contracts;

        } catch (error) {
            console.error("Erreur lors de la récupération des contrats CI avec filtres:", error);
            return [];
        }
    }

    /**
     * Récupère les statistiques des contrats
     * @param {ContractsCIFilters} filters - Filtres optionnels pour les statistiques
     * @returns {Promise<ContractsCIStats>} - Statistiques des contrats
     */
    async getContractsStats(filters?: ContractsCIFilters): Promise<ContractsCIStats> {
        try {
            const { collection, db, getDocs, query, where } = await getFirestore();

            const constraints: any[] = [];

            // Filtrer par statut si spécifié
            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            // Filtrer par paymentFrequency si spécifié
            if (filters?.paymentFrequency && filters.paymentFrequency !== 'all') {
                constraints.push(where("paymentFrequency", "==", filters.paymentFrequency));
            }

            // Filtrer par catégorie/forfait si spécifié
            if (filters?.subscriptionCIID) {
                constraints.push(where("subscriptionCIID", "==", filters.subscriptionCIID));
            }

            const q = constraints.length > 0
                ? query(collection(db, firebaseCollectionNames.contractsCI || "contractsCI"), ...constraints)
                : query(collection(db, firebaseCollectionNames.contractsCI || "contractsCI"));

            const querySnapshot = await getDocs(q);

            const contracts: ContractCI[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                contracts.push({
                    id: doc.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    firstPaymentDate: this.toDateString(data.firstPaymentDate),
                });
            });

            const total = contracts.length;
            const active = contracts.filter(c => c.status === 'ACTIVE').length;
            const finished = contracts.filter(c => c.status === 'FINISHED').length;
            const canceled = contracts.filter(c => c.status === 'CANCELED').length;

            const totalAmount = contracts.reduce(
                (sum, c) => sum + (c.subscriptionCIAmountPerMonth * c.subscriptionCIDuration),
                0
            );

            return {
                total,
                active,
                finished,
                canceled,
                totalAmount,
                activePercentage: total > 0 ? (active / total) * 100 : 0,
                finishedPercentage: total > 0 ? (finished / total) * 100 : 0,
                canceledPercentage: total > 0 ? (canceled / total) * 100 : 0,
            };

        } catch (error) {
            console.error("Erreur lors de la récupération des statistiques CI:", error);
            return {
                total: 0,
                active: 0,
                finished: 0,
                canceled: 0,
                totalAmount: 0,
                activePercentage: 0,
                finishedPercentage: 0,
                canceledPercentage: 0,
            };
        }
    }

    /**
     * Filtre les contrats pour ne garder que ceux avec des versements en retard
     * @param {ContractCI[]} contracts - Liste des contrats à filtrer
     * @returns {Promise<ContractCI[]>} - Liste des contrats en retard
     */
    private async filterOverdueContracts(contracts: ContractCI[]): Promise<ContractCI[]> {
        const { collection, db, getDocs, query, where } = await getFirestore();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueContracts: ContractCI[] = [];

        for (const contract of contracts) {
            // Ne vérifier que les contrats actifs
            if (contract.status !== 'ACTIVE') {
                continue;
            }

            try {
                // Récupérer les versements du contrat
                const paymentsCollectionRef = collection(
                    db,
                    firebaseCollectionNames.contractsCI || "contractsCI",
                    contract.id,
                    "payments"
                );

                // Récupérer uniquement les versements avec status DUE ou PARTIAL
                const paymentsQuery = query(
                    paymentsCollectionRef,
                    where("status", "in", ["DUE", "PARTIAL"])
                );

                const paymentsSnapshot = await getDocs(paymentsQuery);

                // Vérifier si au moins un versement est en retard
                let hasOverdue = false;

                for (const paymentDoc of paymentsSnapshot.docs) {
                    const payment = paymentDoc.data();
                    
                    // Calculer la date d'échéance à partir de firstPaymentDate et monthIndex
                    if (contract.firstPaymentDate) {
                        const firstPaymentDate = new Date(contract.firstPaymentDate);
                        firstPaymentDate.setHours(0, 0, 0, 0);
                        
                        // Calculer la date d'échéance pour ce mois
                        const dueDate = new Date(firstPaymentDate);
                        if (contract.paymentFrequency === 'MONTHLY') {
                            // Pour les contrats mensuels, ajouter le nombre de mois
                            dueDate.setMonth(dueDate.getMonth() + (payment.monthIndex || 0));
                        } else if (contract.paymentFrequency === 'DAILY') {
                            // Pour les contrats journaliers, ajouter le nombre de jours
                            dueDate.setDate(dueDate.getDate() + (payment.monthIndex || 0));
                        }
                        dueDate.setHours(0, 0, 0, 0);

                        // Si la date d'échéance est passée, le versement est en retard
                        if (dueDate < today) {
                            hasOverdue = true;
                            break;
                        }
                    } else {
                        // Si pas de firstPaymentDate, considérer comme en retard si status est DUE ou PARTIAL
                        // (cela signifie qu'un versement est attendu mais pas encore payé)
                        hasOverdue = true;
                        break;
                    }
                }

                if (hasOverdue) {
                    overdueContracts.push(contract);
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification des retards pour le contrat ${contract.id}:`, error);
                // En cas d'erreur, ne pas inclure le contrat
            }
        }

        return overdueContracts;
    }
}
