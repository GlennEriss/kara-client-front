import { IProfessionRepository } from "./IProfessionRepository";
import { Profession, ProfessionSearchResult, ProfessionFilters, PaginatedProfessions } from "../entities/profession.types";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";
import { normalizeName } from "../utils/normalizeName";

const getFirestore = () => import("@/firebase/firestore");

/**
 * Cache pour stocker les curseurs de pagination par page et filtre
 * Format: { "search-''-page-2": "documentId", "search-'test'-page-3": "documentId" }
 */
interface CursorCache {
  [key: string]: string | null;
}

export class ProfessionRepository implements IProfessionRepository {
  readonly name = "ProfessionRepository";
  
  // Cache des curseurs pour éviter de refaire les requêtes
  private cursorCache: CursorCache = {};
  
  /**
   * Nettoie le cache des curseurs (appelé après mutations)
   */
  private clearCursorCache(): void {
    this.cursorCache = {};
  }

  /**
   * Génère une clé de cache pour un filtre et une page donnés
   */
  private getCacheKey(filters: ProfessionFilters, page: number): string {
    const searchKey = filters.search?.trim() || '';
    return `search-${searchKey}-page-${page}`;
  }

  /**
   * Recherche une profession par nom
   */
  async findByName(professionName: string): Promise<ProfessionSearchResult> {
    try {
      const { collection, db, getDocs, query, where } = await getFirestore();
      
      const normalizedName = normalizeName(professionName);
      
      const exactQuery = query(
        collection(db, firebaseCollectionNames.professions || "professions"),
        where("normalizedName", "==", normalizedName)
      );
      
      const exactSnapshot = await getDocs(exactQuery);
      
      if (!exactSnapshot.empty) {
        const doc = exactSnapshot.docs[0];
        const data = doc.data();
        const profession: Profession = {
          id: doc.id,
          name: data.name,
          normalizedName: data.normalizedName,
          category: data.category,
          description: data.description,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        };
        
        return { found: true, profession };
      }
      
      const suggestionsQuery = query(
        collection(db, firebaseCollectionNames.professions || "professions"),
        where("normalizedName", ">=", normalizedName),
        where("normalizedName", "<=", normalizedName + "\uf8ff")
      );
      
      const suggestionsSnapshot = await getDocs(suggestionsQuery);
      const suggestions: string[] = [];
      
      suggestionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && !suggestions.includes(data.name)) {
          suggestions.push(data.name);
        }
      });
      
      return {
        found: false,
        suggestions: suggestions.slice(0, 5)
      };
      
    } catch (error) {
      console.error("Erreur lors de la recherche de profession:", error);
      return { found: false, suggestions: [] };
    }
  }

  /**
   * Crée une nouvelle profession
   */
  async create(data: Omit<Profession, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Profession> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore();
      const normalizedName = normalizeName(data.name);
      
      // Filtrer les valeurs undefined pour éviter les erreurs Firebase
      const filteredData: Record<string, any> = {
        name: data.name,
        normalizedName,
        createdBy: adminId,
      };
      
      if (data.category) {
        filteredData.category = data.category;
      }
      if (data.description) {
        filteredData.description = data.description;
      }
      
      const collectionRef = collection(db, firebaseCollectionNames.professions || "professions");
      const docRef = await addDoc(collectionRef, {
        ...filteredData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      const createdProfession = await this.getById(docRef.id);
      if (!createdProfession) {
        throw new Error("Erreur lors de la récupération de la profession créée");
      }
      
      // Nettoyer le cache après création
      this.clearCursorCache();
      
      return createdProfession;
    } catch (error) {
      console.error("Erreur lors de la création de la profession:", error);
      throw error;
    }
  }

  /**
   * Récupère une profession par son ID
   */
  async getById(id: string): Promise<Profession | null> {
    try {
      const { doc, getDoc, db } = await getFirestore();
      const docRef = doc(db, firebaseCollectionNames.professions || "professions", id);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name,
        normalizedName: data.normalizedName,
        category: data.category,
        description: data.description,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de la profession:", error);
      return null;
    }
  }

  /**
   * Récupère toutes les professions avec filtres optionnels
   */
  async getAll(filters?: ProfessionFilters): Promise<Profession[]> {
    try {
      const { collection, db, getDocs, query, orderBy, where } = await getFirestore();
      const jobsRef = collection(db, firebaseCollectionNames.professions || "professions");
      const constraints: any[] = [];

      if (filters?.search && filters.search.trim().length > 0) {
        const normalized = normalizeName(filters.search);
        constraints.push(where("normalizedName", ">=", normalized));
        constraints.push(where("normalizedName", "<=", normalized + "\uf8ff"));
        constraints.push(orderBy("normalizedName", "asc"));
      } else {
        constraints.push(orderBy("createdAt", "desc"));
      }

      const q = query(jobsRef, ...constraints);
      const snap = await getDocs(q);

      const professions: Profession[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as any;
        professions.push({
          id: doc.id,
          name: data.name,
          normalizedName: data.normalizedName,
          category: data.category,
          description: data.description,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        });
      });

      return professions;
    } catch (error) {
      console.error("Erreur lors de la récupération des professions:", error);
      return [];
    }
  }

  /**
   * Récupère les professions avec pagination côté serveur
   * Utilise Firestore limit() et startAfter() pour une pagination efficace
   */
  async getPaginated(filters: ProfessionFilters = {}, page: number = 1, limit: number = 12): Promise<PaginatedProfessions> {
    try {
      const { 
        collection, 
        db, 
        getDocs, 
        query, 
        orderBy, 
        where, 
        limit: firestoreLimit, 
        startAfter,
        doc,
        getDoc,
        getCountFromServer
      } = await getFirestore();
      
      const jobsRef = collection(db, firebaseCollectionNames.professions || "professions");
      const constraints: any[] = [];

      // Construire la requête de base avec filtres
      if (filters.search && filters.search.trim().length > 0) {
        const normalized = normalizeName(filters.search);
        constraints.push(where("normalizedName", ">=", normalized));
        constraints.push(where("normalizedName", "<=", normalized + "\uf8ff"));
        constraints.push(orderBy("normalizedName", "asc"));
      } else {
        constraints.push(orderBy("createdAt", "desc"));
      }

      // Pour la page 1, récupérer directement
      // Pour les pages suivantes, utiliser startAfter avec le curseur de la page précédente
      let pageData: Profession[] = [];
      let lastDocId: string | null = null;

      if (page === 1) {
        // Page 1 : récupérer limit + 1 pour savoir s'il y a une page suivante
        const q = query(jobsRef, ...constraints, firestoreLimit(limit + 1));
        const snap = await getDocs(q);
        
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          pageData.push({
            id: docSnap.id,
            name: data.name,
            normalizedName: data.normalizedName,
            category: data.category,
            description: data.description,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
          });
        });

        // Si on a limit + 1 résultats, il y a une page suivante
        const hasNextPage = pageData.length > limit;
        if (hasNextPage) {
          // Retirer l'élément en trop
          pageData = pageData.slice(0, limit);
        }

        // Stocker le curseur du dernier élément de la page 1 pour la page 2
        if (pageData.length > 0) {
          const lastDoc = snap.docs[pageData.length - 1];
          lastDocId = lastDoc.id;
          this.cursorCache[this.getCacheKey(filters, 2)] = lastDocId;
        }
      } else {
        // Pages suivantes : utiliser le curseur stocké pour cette page
        // Le curseur pour la page N est le dernier élément de la page N-1
        const pageCursor = this.cursorCache[this.getCacheKey(filters, page)];
        
        if (!pageCursor) {
          // Si pas de curseur, on doit récupérer depuis le début (inefficace mais nécessaire)
          // On pourrait aussi retourner une erreur, mais pour la compatibilité, on récupère tout
          this.clearCursorCache();
          return this.getPaginated(filters, 1, limit);
        }

        const cursorDocRef = doc(db, firebaseCollectionNames.professions || "professions", pageCursor);
        const cursorDoc = await getDoc(cursorDocRef);
        
        if (!cursorDoc.exists()) {
          // Le curseur n'existe plus, recommencer depuis la page 1
          this.clearCursorCache();
          return this.getPaginated(filters, 1, limit);
        }

        // Construire la requête avec startAfter
        const q = query(
          jobsRef, 
          ...constraints, 
          startAfter(cursorDoc),
          firestoreLimit(limit + 1)
        );
        const snap = await getDocs(q);

        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          pageData.push({
            id: docSnap.id,
            name: data.name,
            normalizedName: data.normalizedName,
            category: data.category,
            description: data.description,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
          });
        });

        // Si on a limit + 1 résultats, il y a une page suivante
        const hasNextPage = pageData.length > limit;
        if (hasNextPage) {
          // Retirer l'élément en trop
          pageData = pageData.slice(0, limit);
        }

        // Stocker le curseur du dernier élément de la page actuelle pour la page suivante
        if (pageData.length > 0) {
          const lastDoc = snap.docs[pageData.length - 1];
          lastDocId = lastDoc.id;
          this.cursorCache[this.getCacheKey(filters, page + 1)] = lastDocId;
        }
      }

      // Pour le total, utiliser getCountFromServer si possible
      // Sinon, estimer basé sur la présence de pages suivantes
      let totalItems = 0;
      try {
        const countQuery = query(jobsRef, ...constraints);
        const countSnapshot = await getCountFromServer(countQuery);
        totalItems = countSnapshot.data().count;
      } catch (countError) {
        // Si getCountFromServer échoue (pas d'index composite), estimer
        // Estimation basique : si on a une page suivante, il y a au moins (page * limit) + 1 éléments
        const hasNextPage = pageData.length === limit && lastDocId !== null;
        if (hasNextPage) {
          totalItems = page * limit + 1; // Minimum
        } else {
          totalItems = (page - 1) * limit + pageData.length;
        }
      }

      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const hasNextPage = pageData.length === limit && lastDocId !== null;
      const hasPrevPage = page > 1;

      return {
        data: pageData,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération paginée des professions:", error);
      return {
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  /**
   * Met à jour une profession
   */
  async update(id: string, updates: Partial<Omit<Profession, 'id' | 'createdAt' | 'createdBy'>>): Promise<Profession | null> {
    try {
      const { doc, db, updateDoc, serverTimestamp } = await getFirestore();
      const ref = doc(db, firebaseCollectionNames.professions || 'professions', id);
      const payload: any = { ...updates, updatedAt: serverTimestamp() };
      if (updates.name) {
        payload.normalizedName = normalizeName(updates.name);
      }
      await updateDoc(ref, payload);
      
      // Nettoyer le cache après mise à jour
      this.clearCursorCache();
      
      return await this.getById(id);
    } catch (error) {
      console.error('Erreur updateProfession:', error);
      throw error;
    }
  }

  /**
   * Supprime une profession
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, db, deleteDoc } = await getFirestore();
      const ref = doc(db, firebaseCollectionNames.professions || 'professions', id);
      await deleteDoc(ref);
      
      // Nettoyer le cache après suppression
      this.clearCursorCache();
    } catch (error) {
      console.error('Erreur deleteProfession:', error);
      throw error;
    }
  }

  /**
   * Trouve ou crée une profession
   */
  async findOrCreate(
    professionName: string,
    adminId: string,
    additionalData?: {
      category?: string;
      description?: string;
    }
  ): Promise<{ id: string; isNew: boolean }> {
    try {
      // D'abord, chercher si la profession existe déjà
      const searchResult = await this.findByName(professionName);
      
      if (searchResult.found && searchResult.profession) {
        return { 
          id: searchResult.profession.id, 
          isNew: false 
        };
      }
      
      // Si elle n'existe pas, la créer
      const newProfession = await this.create({
        name: professionName,
        normalizedName: normalizeName(professionName),
        category: additionalData?.category,
        description: additionalData?.description,
        createdBy: adminId,
      }, adminId);
      
      return { 
        id: newProfession.id, 
        isNew: true 
      };
      
    } catch (error) {
      console.error("Erreur lors de la recherche ou création de profession:", error);
      throw new Error("Impossible de traiter la profession");
    }
  }
}
