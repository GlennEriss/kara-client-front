import { ICompanyRepository, CompanyFilters, PaginatedCompanies } from "./ICompanyRepository";
import { Company, CompanySearchResult } from "../entities/company.types";
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

export class CompanyRepository implements ICompanyRepository {
  readonly name = "CompanyRepository";
  
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
  private getCacheKey(filters: CompanyFilters, page: number): string {
    const searchKey = filters.search?.trim() || '';
    return `search-${searchKey}-page-${page}`;
  }

  /**
   * Recherche une entreprise par nom
   */
  async findByName(companyName: string): Promise<CompanySearchResult> {
    try {
      const { collection, db, getDocs, query, where } = await getFirestore();
      
      const normalizedName = normalizeName(companyName);
      
      const exactQuery = query(
        collection(db, firebaseCollectionNames.companies || "companies"),
        where("normalizedName", "==", normalizedName)
      );
      
      const exactSnapshot = await getDocs(exactQuery);
      
      if (!exactSnapshot.empty) {
        const doc = exactSnapshot.docs[0];
        const data = doc.data();
        const company: Company = {
          id: doc.id,
          name: data.name,
          normalizedName: data.normalizedName,
          address: data.address,
          industry: data.industry,
          employeeCount: data.employeeCount,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        };
        
        return { found: true, company };
      }
      
      const suggestionsQuery = query(
        collection(db, firebaseCollectionNames.companies || "companies"),
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
      console.error("Erreur lors de la recherche d'entreprise:", error);
      return { found: false, suggestions: [] };
    }
  }

  /**
   * Crée une nouvelle entreprise
   */
  async create(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>, adminId: string): Promise<Company> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore();
      const normalizedName = normalizeName(data.name);
      
      // Filtrer les valeurs undefined pour éviter les erreurs Firebase
      const filteredData: Record<string, any> = {
        name: data.name,
        normalizedName,
        createdBy: adminId,
      };
      
      if (data.address) {
        filteredData.address = data.address;
      }
      if (data.industry) {
        filteredData.industry = data.industry;
      }
      if (data.employeeCount !== undefined) {
        filteredData.employeeCount = data.employeeCount;
      }
      
      const collectionRef = collection(db, firebaseCollectionNames.companies || "companies");
      const docRef = await addDoc(collectionRef, {
        ...filteredData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      const createdCompany = await this.getById(docRef.id);
      if (!createdCompany) {
        throw new Error("Erreur lors de la récupération de l'entreprise créée");
      }
      
      // Nettoyer le cache après création
      this.clearCursorCache();
      
      return createdCompany;
    } catch (error) {
      console.error("Erreur lors de la création de l'entreprise:", error);
      throw error;
    }
  }

  /**
   * Récupère une entreprise par son ID
   */
  async getById(id: string): Promise<Company | null> {
    try {
      const { doc, getDoc, db } = await getFirestore();
      const docRef = doc(db, firebaseCollectionNames.companies || "companies", id);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        return null;
      }
      
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name,
        normalizedName: data.normalizedName,
        address: data.address,
        industry: data.industry,
        employeeCount: data.employeeCount,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de l'entreprise:", error);
      return null;
    }
  }

  /**
   * Récupère toutes les entreprises avec filtres optionnels
   */
  async getAll(filters?: CompanyFilters): Promise<Company[]> {
    try {
      const { collection, db, getDocs, query, orderBy, where } = await getFirestore();
      const colRef = collection(db, firebaseCollectionNames.companies || 'companies');
      const constraints: any[] = [];

      if (filters?.search && filters.search.trim().length > 0) {
        const normalized = normalizeName(filters.search);
        constraints.push(where('normalizedName', '>=', normalized));
        constraints.push(where('normalizedName', '<=', normalized + '\uf8ff'));
        constraints.push(orderBy('normalizedName', 'asc'));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      const q = query(colRef, ...constraints);
      const snap = await getDocs(q);

      const companies: Company[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        companies.push({
          id: doc.id,
          name: data.name,
          normalizedName: data.normalizedName,
          address: data.address,
          industry: data.industry,
          employeeCount: data.employeeCount,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        });
      });

      return companies;
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises:', error);
      return [];
    }
  }

  /**
   * Récupère les entreprises avec pagination côté serveur
   * Utilise Firestore limit() et startAfter() pour une pagination efficace
   */
  async getPaginated(filters: CompanyFilters = {}, page: number = 1, limit: number = 12): Promise<PaginatedCompanies> {
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
      
      const colRef = collection(db, firebaseCollectionNames.companies || 'companies');
      const constraints: any[] = [];

      // Construire la requête de base avec filtres
      if (filters.search && filters.search.trim().length > 0) {
        const normalized = normalizeName(filters.search);
        constraints.push(where('normalizedName', '>=', normalized));
        constraints.push(where('normalizedName', '<=', normalized + '\uf8ff'));
        constraints.push(orderBy('normalizedName', 'asc'));
      } else {
        constraints.push(orderBy('createdAt', 'desc'));
      }

      // Pour la page 1, récupérer directement
      // Pour les pages suivantes, utiliser startAfter avec le curseur de la page précédente
      let pageData: Company[] = [];
      let lastDocId: string | null = null;

      if (page === 1) {
        // Page 1 : récupérer limit + 1 pour savoir s'il y a une page suivante
        const q = query(colRef, ...constraints, firestoreLimit(limit + 1));
        const snap = await getDocs(q);
        
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          pageData.push({
            id: docSnap.id,
            name: data.name,
            normalizedName: data.normalizedName,
            address: data.address,
            industry: data.industry,
            employeeCount: data.employeeCount,
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

        const cursorDocRef = doc(db, firebaseCollectionNames.companies || 'companies', pageCursor);
        const cursorDoc = await getDoc(cursorDocRef);
        
        if (!cursorDoc.exists()) {
          // Le curseur n'existe plus, recommencer depuis la page 1
          this.clearCursorCache();
          return this.getPaginated(filters, 1, limit);
        }

        // Construire la requête avec startAfter
        const q = query(
          colRef, 
          ...constraints, 
          startAfter(cursorDoc),
          firestoreLimit(limit + 1)
        );
        const snap = await getDocs(q);

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          pageData.push({
            id: docSnap.id,
            name: data.name,
            normalizedName: data.normalizedName,
            address: data.address,
            industry: data.industry,
            employeeCount: data.employeeCount,
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
        const countQuery = query(colRef, ...constraints);
        const countSnapshot = await getCountFromServer(countQuery);
        totalItems = countSnapshot.data().count;
      } catch (_countError) {
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
      console.error('Erreur lors de la récupération paginée des entreprises:', error);
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
   * Met à jour une entreprise
   */
  async update(id: string, updates: Partial<Omit<Company, 'id' | 'createdAt' | 'createdBy'>>): Promise<Company | null> {
    try {
      const { doc, db, updateDoc, serverTimestamp } = await getFirestore();
      const ref = doc(db, firebaseCollectionNames.companies || 'companies', id);
      const payload: any = { ...updates, updatedAt: serverTimestamp() };
      if (updates.name) {
        payload.normalizedName = normalizeName(updates.name);
      }
      await updateDoc(ref, payload);
      
      // Nettoyer le cache après mise à jour
      this.clearCursorCache();
      
      return await this.getById(id);
    } catch (error) {
      console.error('Erreur updateCompany:', error);
      throw error;
    }
  }

  /**
   * Supprime une entreprise
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, db, deleteDoc } = await getFirestore();
      const ref = doc(db, firebaseCollectionNames.companies || 'companies', id);
      await deleteDoc(ref);
      
      // Nettoyer le cache après suppression
      this.clearCursorCache();
    } catch (error) {
      console.error('Erreur deleteCompany:', error);
      throw error;
    }
  }

  /**
   * Trouve ou crée une entreprise
   */
  async findOrCreate(
    companyName: string,
    adminId: string,
    additionalData?: {
      address?: { 
        province?: string; 
        city?: string; 
        district?: string;
        arrondissement?: string;
        additionalInfo?: string;
      };
      industry?: string;
      employeeCount?: number;
    }
  ): Promise<{ id: string; isNew: boolean }> {
    try {
      // D'abord, chercher si l'entreprise existe déjà
      const searchResult = await this.findByName(companyName);
      
      if (searchResult.found && searchResult.company) {
        return { 
          id: searchResult.company.id, 
          isNew: false 
        };
      }
      
      // Si elle n'existe pas, la créer
      const newCompany = await this.create({
        name: companyName,
        normalizedName: normalizeName(companyName),
        address: additionalData?.address,
        industry: additionalData?.industry,
        employeeCount: additionalData?.employeeCount,
        createdBy: adminId,
      }, adminId);
      
      return { 
        id: newCompany.id, 
        isNew: true 
      };
      
    } catch (error) {
      console.error("Erreur lors de la recherche ou création d'entreprise:", error);
      throw new Error("Impossible de traiter l'entreprise");
    }
  }
}
