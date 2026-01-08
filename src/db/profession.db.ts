/**
 * @module profession.db
 * Database operations for professions
 */

import { createModel } from "./generic.db";
import type { Profession, ProfessionSearchResult } from "@/types/types";

const getFirestore = () => import("@/firebase/firestore");

/**
 * Normalise un nom pour la recherche (supprime accents, majuscules, etc.)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recherche une profession par nom
 */
export async function findProfessionByName(professionName: string): Promise<ProfessionSearchResult> {
  try {
    const { collection, db, getDocs, query, where } = await getFirestore();
    
    const normalizedName = normalizeName(professionName);
    
    const exactQuery = query(
      collection(db, "professions"),
      where("normalizedName", "==", normalizedName)
    );
    
    const exactSnapshot = await getDocs(exactQuery);
    
    if (!exactSnapshot.empty) {
      const doc = exactSnapshot.docs[0];
      const profession = {
        id: doc.id,
        ...doc.data()
      } as Profession;
      
      return { found: true, profession };
    }
    
    const suggestionsQuery = query(
      collection(db, "professions"),
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

export interface JobsFilters {
  search?: string
}

export interface PaginatedJobs {
  data: Profession[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/**
 * Récupère les professions (jobs) avec recherche et pagination (page-based, simple)
 */
export async function getJobsPaginated(
  filters: JobsFilters = {},
  page: number = 1,
  limit: number = 12
): Promise<PaginatedJobs> {
  try {
    const { collection, db, getDocs, query, orderBy, where, getCountFromServer } = await getFirestore();

    const jobsRef = collection(db, "professions");
    const constraints: any[] = [];

    if (filters.search && filters.search.trim().length > 0) {
      const normalized = normalizeName(filters.search);
      // Utilisation d'une plage sur normalizedName pour la recherche préfixe
      constraints.push(where("normalizedName", ">=", normalized));
      constraints.push(where("normalizedName", "<=", normalized + "\uf8ff"));
      constraints.push(orderBy("normalizedName", "asc"));
    } else {
      constraints.push(orderBy("createdAt", "desc"));
    }

    // Récupérer toutes les correspondances, puis paginer côté client (simple et suffisant pour des tailles modestes)
    const q = query(jobsRef, ...constraints);
    const [snap, countSnap] = await Promise.all([
      getDocs(q),
      getCountFromServer(jobsRef),
    ]);

    const all: Profession[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as any;
      all.push({
        id: doc.id,
        name: data.name,
        normalizedName: data.normalizedName,
        category: data.category,
        description: data.description,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        createdBy: data.createdBy,
      });
    });

    const totalItems = all.length; // correspond au filtrage appliqué; getCountFromServer(jobsRef) donne total collection
    const startIndex = (page - 1) * limit;
    const pageData = all.slice(startIndex, startIndex + limit);

    return {
      data: pageData,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        totalItems,
        itemsPerPage: limit,
        hasNextPage: startIndex + limit < totalItems,
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des jobs:", error);
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
 * Crée une nouvelle profession
 */
export async function createProfession(
  professionName: string, 
  adminId: string,
  additionalData: {
    category?: string;
    description?: string;
  } = {}
): Promise<string> {
  try {
    const normalizedName = normalizeName(professionName);
    
    // Filtrer les valeurs undefined pour éviter les erreurs Firebase
    const filteredAdditionalData: Record<string, string> = {}
    if (additionalData.category !== undefined && additionalData.category !== null && additionalData.category.trim() !== '') {
      filteredAdditionalData.category = additionalData.category.trim()
    }
    if (additionalData.description !== undefined && additionalData.description !== null && additionalData.description.trim() !== '') {
      filteredAdditionalData.description = additionalData.description.trim()
    }
    
    const professionData = {
      name: professionName,
      normalizedName,
      createdBy: adminId,
      ...filteredAdditionalData
    };
    
    const professionId = await createModel<typeof professionData>(
      professionData,
      "professions"
    );
    
    if (!professionId) {
      throw new Error("Erreur lors de la création de la profession");
    }
    
    return professionId;
    
  } catch (error) {
    console.error("Erreur lors de la création de la profession:", error);
    throw new Error("Impossible de créer la profession");
  }
}

/** Met à jour une profession */
export async function updateProfession(id: string, updates: Partial<Pick<Profession, 'name' | 'category' | 'description'>>): Promise<boolean> {
  try {
    const { doc, db, updateDoc, serverTimestamp } = await getFirestore() as any;
    const ref = doc(db, 'professions', id);
    const payload: any = { ...updates, updatedAt: serverTimestamp() };
    if (updates.name) payload.normalizedName = normalizeName(updates.name);
    await updateDoc(ref, payload);
    return true;
  } catch (error) {
    console.error('Erreur updateProfession:', error);
    return false;
  }
}

/** Supprime une profession */
export async function deleteProfession(id: string): Promise<boolean> {
  try {
    const { doc, db, deleteDoc } = await getFirestore() as any;
    const ref = doc(db, 'professions', id);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error('Erreur deleteProfession:', error);
    return false;
  }
}

/**
 * Trouve ou crée une profession
 */
export async function findOrCreateProfession(
  professionName: string,
  adminId: string,
  additionalData: {
    category?: string;
    description?: string;
  } = {}
): Promise<{ id: string; isNew: boolean }> {
  try {
    // D'abord, chercher si la profession existe déjà
    const searchResult = await findProfessionByName(professionName);
    
    if (searchResult.found && searchResult.profession) {
      return { 
        id: searchResult.profession.id!, 
        isNew: false 
      };
    }
    
    // Si elle n'existe pas, la créer
    const newProfessionId = await createProfession(professionName, adminId, additionalData);
    
    return { 
      id: newProfessionId, 
      isNew: true 
    };
    
  } catch (error) {
    console.error("Erreur lors de la recherche ou création de profession:", error);
    throw new Error("Impossible de traiter la profession");
  }
}