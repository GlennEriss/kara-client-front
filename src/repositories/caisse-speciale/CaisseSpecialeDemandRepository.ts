import { ICaisseSpecialeDemandRepository } from "./ICaisseSpecialeDemandRepository";
import { CaisseSpecialeDemand, CaisseSpecialeDemandFilters, CaisseSpecialeDemandStats, CaisseSpecialeDemandsPaginated } from "@/types/types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";

const getFirestore = () => import("@/firebase/firestore");

export class CaisseSpecialeDemandRepository implements ICaisseSpecialeDemandRepository {
    readonly name = "CaisseSpecialeDemandRepository";

    async createDemand(data: Omit<CaisseSpecialeDemand, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<CaisseSpecialeDemand> {
        try {
            const { collection, doc, setDoc, db, serverTimestamp } = await getFirestore();

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            // Utiliser l'ID personnalisé si fourni, sinon générer un ID automatique
            const demandId = customId || doc(collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands")).id;
            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", demandId);

            await setDoc(demandRef, {
                ...cleanData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const created = await this.getDemandById(demandId);
            if (!created) {
                throw new Error("Erreur lors de la récupération de la demande créée");
            }

            return created;
        } catch (error) {
            console.error("Erreur lors de la création de la demande:", error);
            throw error;
        }
    }

    async getDemandById(id: string): Promise<CaisseSpecialeDemand | null> {
        try {
            const { doc, getDoc, db } = await getFirestore();
            
            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);
            const docSnap = await getDoc(demandRef);
            
            if (!docSnap.exists()) {
                return null;
            }
            
            const data = docSnap.data();
            const toDate = (v: unknown) => (v as any)?.toDate ? (v as any).toDate() : undefined;
            return {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                decisionMadeAt: toDate(data.decisionMadeAt),
                reopenedAt: toDate(data.reopenedAt),
                approvedAt: toDate(data.approvedAt),
                rejectedAt: toDate(data.rejectedAt),
                convertedAt: toDate(data.convertedAt),
            } as CaisseSpecialeDemand;
        } catch (error) {
            console.error("Erreur lors de la récupération de la demande:", error);
            return null;
        }
    }

    async getByContractId(contractId: string): Promise<CaisseSpecialeDemand | null> {
        try {
            const { collection, db, getDocs, query, where, limit } = await getFirestore();
            const colRef = collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands");
            const q = query(colRef, where("contractId", "==", contractId), limit(1));
            const snap = await getDocs(q);
            if (snap.empty) return null;
            const docSnap = snap.docs[0];
            const data = docSnap.data();
            const toDate = (v: unknown) => (v as any)?.toDate ? (v as any).toDate() : undefined;
            return {
                id: docSnap.id,
                ...(data as any),
                createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                decisionMadeAt: toDate(data.decisionMadeAt),
                reopenedAt: toDate(data.reopenedAt),
                approvedAt: toDate(data.approvedAt),
                rejectedAt: toDate(data.rejectedAt),
                convertedAt: toDate(data.convertedAt),
            } as CaisseSpecialeDemand;
        } catch (error) {
            console.error("Erreur getByContractId:", error);
            return null;
        }
    }

    async getDemandsWithFilters(filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandsPaginated> {
        try {
            const hasSearch = Boolean(filters?.search && filters.search.trim().length >= 2);
            const normalizedSearch = hasSearch
                ? filters!.search!.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                : '';

            if (hasSearch) {
                return this.getPaginatedWithSearchMerge(filters!, normalizedSearch);
            }

            const { collection, db, getDocs, getCountFromServer, query, where, orderBy, limit, startAfter } = await getFirestore();

            const colRef = collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands");
            const constraints: any[] = [];

            if (filters?.status && filters.status !== 'all') {
                constraints.push(where("status", "==", filters.status));
            }

            if (filters?.contractType && filters.contractType !== 'all') {
                constraints.push(where("contractType", "==", filters.contractType));
            }

            if (filters?.caisseType && filters.caisseType !== 'all') {
                constraints.push(where("caisseType", "==", filters.caisseType));
            }

            if (filters?.memberId) {
                constraints.push(where("memberId", "==", filters.memberId));
            }

            if (filters?.groupeId) {
                constraints.push(where("groupeId", "==", filters.groupeId));
            }

            if (filters?.decisionMadeBy) {
                constraints.push(where("decisionMadeBy", "==", filters.decisionMadeBy));
            }

            if (filters?.createdAtFrom) {
                constraints.push(where("createdAt", ">=", filters.createdAtFrom));
            }
            if (filters?.createdAtTo) {
                constraints.push(where("createdAt", "<=", filters.createdAtTo));
            }

            constraints.push(orderBy("createdAt", "desc"));

            const baseQuery = query(colRef, ...constraints);

            let total = 0;
            try {
                const countSnapshot = await getCountFromServer(baseQuery);
                total = countSnapshot.data().count;
            } catch (countError) {
                console.warn("getCountFromServer failed:", countError);
            }

            const pageSize = filters?.limit || 12;
            const currentPage = filters?.page || 1;
            const offset = (currentPage - 1) * pageSize;

            let paginatedQuery = query(baseQuery, limit(pageSize));

            if (offset > 0) {
                const offsetQuery = query(baseQuery, limit(offset));
                const offsetSnapshot = await getDocs(offsetQuery);
                if (offsetSnapshot.docs.length > 0) {
                    const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
                    paginatedQuery = query(baseQuery, startAfter(lastDoc), limit(pageSize));
                }
            }

            const querySnapshot = await getDocs(paginatedQuery);
            const demands: CaisseSpecialeDemand[] = [];

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const toDate = (v: unknown) => (v as any)?.toDate ? (v as any).toDate() : undefined;
                demands.push({
                    id: docSnap.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    decisionMadeAt: toDate(data.decisionMadeAt),
                    reopenedAt: toDate(data.reopenedAt),
                    approvedAt: toDate(data.approvedAt),
                    rejectedAt: toDate(data.rejectedAt),
                    convertedAt: toDate(data.convertedAt),
                } as CaisseSpecialeDemand);
            });

            let filteredDemands = demands;
            if (filters?.desiredDateFrom) {
                filteredDemands = filteredDemands.filter((d) => new Date(d.desiredDate) >= filters.desiredDateFrom!);
            }
            if (filters?.desiredDateTo) {
                filteredDemands = filteredDemands.filter((d) => new Date(d.desiredDate) <= filters.desiredDateTo!);
            }

            return { items: filteredDemands, total };
        } catch (error) {
            console.error("Erreur lors de la récupération des demandes filtrées:", error);
            // Propager l'erreur pour afficher un message à l'utilisateur (ex: index Firestore manquant)
            throw error;
        }
    }

    private async getPaginatedWithSearchMerge(filters: CaisseSpecialeDemandFilters, normalizedQuery: string): Promise<CaisseSpecialeDemandsPaginated> {
        const { collection, db, getDocs, query, where, orderBy, limit } = await getFirestore();
        const colRef = collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands");
        const searchFields = ['searchableText', 'searchableTextFirstNameFirst', 'searchableTextMatriculeFirst'] as const;
        const fetchLimit = Math.min(100, (filters.limit || 12) * 5);

        const buildConstraints = (searchField: string) => {
            const c: any[] = [];
            if (filters.status && filters.status !== 'all') {
                c.push(where('status', '==', filters.status));
            }
            if (filters.caisseType && filters.caisseType !== 'all') {
                c.push(where('caisseType', '==', filters.caisseType));
            }
            if (filters.memberId) {
                c.push(where('memberId', '==', filters.memberId));
            }
            c.push(where(searchField, '>=', normalizedQuery));
            c.push(where(searchField, '<=', normalizedQuery + '\uf8ff'));
            c.push(orderBy(searchField, 'asc'));
            c.push(orderBy('createdAt', 'desc'));
            return c;
        };

        const [snap1, snap2, snap3] = await Promise.all(
            searchFields.map((field) =>
                getDocs(query(colRef, ...buildConstraints(field), limit(fetchLimit)))
            )
        );

        const seen = new Set<string>();
        const merged: CaisseSpecialeDemand[] = [];
        const addDoc = (docSnap: any) => {
            if (!seen.has(docSnap.id)) {
                seen.add(docSnap.id);
                const data = docSnap.data();
                const toDate = (v: unknown) => (v as any)?.toDate ? (v as any).toDate() : undefined;
                merged.push({
                    id: docSnap.id,
                    ...(data as any),
                    createdAt: (data.createdAt as any)?.toDate ? (data.createdAt as any).toDate() : new Date(),
                    updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
                    decisionMadeAt: toDate(data.decisionMadeAt),
                    reopenedAt: toDate(data.reopenedAt),
                    approvedAt: toDate(data.approvedAt),
                    rejectedAt: toDate(data.rejectedAt),
                    convertedAt: toDate(data.convertedAt),
                } as CaisseSpecialeDemand);
            }
        };
        [snap1, snap2, snap3].forEach((snap) => snap.forEach(addDoc));

        let filtered = merged;
        if (filters.createdAtFrom) {
            filtered = filtered.filter((d) => d.createdAt >= filters.createdAtFrom!);
        }
        if (filters.createdAtTo) {
            filtered = filtered.filter((d) => d.createdAt <= filters.createdAtTo!);
        }
        if (filters.desiredDateFrom) {
            filtered = filtered.filter((d) => new Date(d.desiredDate) >= filters.desiredDateFrom!);
        }
        if (filters.desiredDateTo) {
            filtered = filtered.filter((d) => new Date(d.desiredDate) <= filters.desiredDateTo!);
        }

        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const total = filtered.length;
        const pageSize = filters.limit || 12;
        const currentPage = filters.page || 1;
        const start = (currentPage - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);

        return { items, total };
    }

    async getDemandsStats(_filters?: CaisseSpecialeDemandFilters): Promise<CaisseSpecialeDemandStats> {
        try {
            const { collection, db, getCountFromServer, query, where } = await getFirestore();
            const colRef = collection(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands");

            const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED'] as const;
            const countPromises = statuses.map((status) => {
                const q = query(colRef, where("status", "==", status));
                return getCountFromServer(q);
            });

            const results = await Promise.all(countPromises);
            const [pending, approved, rejected, converted] = results.map((r) => r.data().count);
            const total = pending + approved + rejected + converted;

            return { total, pending, approved, rejected, converted };
        } catch (error) {
            console.error("Erreur lors du calcul des statistiques:", error);
            return {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                converted: 0,
            };
        }
    }

    async updateDemandStatus(
        id: string,
        status: CaisseSpecialeDemand['status'],
        adminId: string,
        reason: string,
        adminName: string
    ): Promise<CaisseSpecialeDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);

            const baseUpdate: Record<string, unknown> = {
                status,
                decisionMadeAt: serverTimestamp(),
                decisionMadeBy: adminId,
                decisionMadeByName: adminName,
                decisionReason: reason,
                updatedBy: adminId,
                updatedAt: serverTimestamp(),
            };

            if (status === 'APPROVED') {
                baseUpdate.approvedBy = adminId;
                baseUpdate.approvedAt = serverTimestamp();
                baseUpdate.approvedByName = adminName;
                baseUpdate.approveReason = reason;
            } else if (status === 'REJECTED') {
                baseUpdate.rejectedBy = adminId;
                baseUpdate.rejectedAt = serverTimestamp();
                baseUpdate.rejectedByName = adminName;
                baseUpdate.rejectReason = reason;
            }

            await updateDoc(demandRef, baseUpdate);

            return await this.getDemandById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour du statut de la demande:", error);
            throw error;
        }
    }

    async updateDemand(id: string, data: Partial<CaisseSpecialeDemand>): Promise<CaisseSpecialeDemand | null> {
        try {
            const { doc, updateDoc, db, serverTimestamp } = await getFirestore();

            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);

            const cleanData: any = { ...data };
            Object.keys(cleanData).forEach((key) => {
                if (cleanData[key] === undefined) {
                    delete cleanData[key];
                }
            });

            await updateDoc(demandRef, {
                ...cleanData,
                updatedAt: serverTimestamp(),
            });

            return await this.getDemandById(id);
        } catch (error) {
            console.error("Erreur lors de la mise à jour de la demande:", error);
            throw error;
        }
    }

    async deleteDemand(id: string): Promise<void> {
        try {
            const { doc, deleteDoc, db } = await getFirestore();
            const demandRef = doc(db, firebaseCollectionNames.caisseSpecialeDemands || "caisseSpecialeDemands", id);
            await deleteDoc(demandRef);
        } catch (error) {
            console.error("Erreur lors de la suppression de la demande:", error);
            throw error;
        }
    }
}

