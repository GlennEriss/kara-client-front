/**
 * @module company.db
 * Database operations for companies and professions
 */

import { createModel } from "./generic.db";
import { firebaseCollectionNames } from "@/constantes/firebase-collection-names";
import type { Company, Profession, CompanySearchResult, ProfessionSearchResult } from "@/types/types";

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
 * Recherche une entreprise par nom
 */
export async function findCompanyByName(companyName: string): Promise<CompanySearchResult> {
  try {
    const { collection, db, getDocs, query, where } = await getFirestore();
    
    const normalizedName = normalizeName(companyName);
    
    const exactQuery = query(
      collection(db, "companies"),
      where("normalizedName", "==", normalizedName)
    );
    
    const exactSnapshot = await getDocs(exactQuery);
    
    if (!exactSnapshot.empty) {
      const doc = exactSnapshot.docs[0];
      const company = {
        id: doc.id,
        ...doc.data()
      } as Company;
      
      return { found: true, company };
    }
    
    const suggestionsQuery = query(
      collection(db, "companies"),
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
export async function createCompany(
  companyName: string, 
  adminId: string,
  additionalData: {
    address?: { 
      province?: string; 
      city?: string; 
      district?: string;
      arrondissement?: string;
      additionalInfo?: string;
    };
    industry?: string;
    employeeCount?: number;
  } = {}
): Promise<string> {
  try {
    const normalizedName = normalizeName(companyName);
    
    const companyData = {
      name: companyName,
      normalizedName,
      ...additionalData
    };
    
    const companyId = await createModel<typeof companyData>(
      companyData,
      "companies"
    );
    
    if (!companyId) {
      throw new Error("Erreur lors de la création de l'entreprise");
    }
    
    return companyId;
    
  } catch (error) {
    console.error("Erreur lors de la création de l'entreprise:", error);
    throw new Error("Impossible de créer l'entreprise");
  }
}

export interface CompaniesFilters {
  search?: string
}

export interface PaginatedCompanies {
  data: Company[]
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
 * Récupère les entreprises avec recherche et pagination (page-based)
 */
export async function getCompaniesPaginated(
  filters: CompaniesFilters = {},
  page: number = 1,
  limit: number = 12
): Promise<PaginatedCompanies> {
  try {
    const { collection, db, getDocs, query, orderBy, where, getCountFromServer } = await getFirestore() as any;
    const colRef = collection(db, 'companies');
    const constraints: any[] = [];

    if (filters.search && filters.search.trim().length > 0) {
      const normalized = normalizeName(filters.search);
      constraints.push(where('normalizedName', '>=', normalized));
      constraints.push(where('normalizedName', '<=', normalized + '\uf8ff'));
      constraints.push(orderBy('normalizedName', 'asc'));
    } else {
      constraints.push(orderBy('createdAt', 'desc'));
    }

    const q = query(colRef, ...constraints);
    const [snap] = await Promise.all([
      getDocs(q),
      // getCountFromServer could be used for total collection, but we want filtered total
    ]);

    const all: Company[] = [];
    snap.forEach((doc: any) => {
      const data = doc.data();
      all.push({
        id: doc.id,
        name: data.name,
        normalizedName: data.normalizedName,
        address: data.address,
        industry: data.industry,
        employeeCount: data.employeeCount,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
        createdBy: data.createdBy,
      });
    });

    const totalItems = all.length;
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
    console.error('Erreur lors de la récupération des entreprises:', error);
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

/** Met à jour une entreprise */
export async function updateCompany(id: string, updates: Partial<Pick<Company, 'name' | 'address' | 'industry'>>): Promise<boolean> {
  try {
    const { doc, db, updateDoc, serverTimestamp } = await getFirestore() as any;
    const ref = doc(db, 'companies', id);
    const payload: any = { ...updates, updatedAt: serverTimestamp() };
    if (updates.name) payload.normalizedName = normalizeName(updates.name);
    await updateDoc(ref, payload);
    return true;
  } catch (error) {
    console.error('Erreur updateCompany:', error);
    return false;
  }
}

/** Supprime une entreprise */
export async function deleteCompany(id: string): Promise<boolean> {
  try {
    const { doc, db, deleteDoc } = await getFirestore() as any;
    const ref = doc(db, 'companies', id);
    await deleteDoc(ref);
    return true;
  } catch (error) {
    console.error('Erreur deleteCompany:', error);
    return false;
  }
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
    
    const professionData = {
      name: professionName,
      normalizedName,
      ...additionalData
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

/**
 * Met à jour les informations d'entreprise dans une demande d'adhésion
 */
export async function updateMembershipRequestCompany(
  requestId: string, 
  companyName: string
): Promise<boolean> {
  try {
    const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
    const docRef = doc(db, firebaseCollectionNames.membershipRequests || "membership-requests", requestId);

    await updateDoc(docRef, {
      "company.companyName": companyName,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'entreprise:", error);
    return false;
  }
}

/**
 * Met à jour les informations de profession dans une demande d'adhésion
 */
export async function updateMembershipRequestProfession(
  requestId: string, 
  professionName: string
): Promise<boolean> {
  try {
    const { db, doc, updateDoc, serverTimestamp } = await getFirestore();
    const docRef = doc(db, firebaseCollectionNames.membershipRequests || "membership-requests", requestId);

    await updateDoc(docRef, {
      "company.profession": professionName,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la profession:", error);
    return false;
  }
}

/**
 * Trouve ou crée une entreprise
 */
export async function findOrCreateCompany(
  companyName: string,
  adminId: string,
  additionalData: {
    address?: { 
      province?: string; 
      city?: string; 
      district?: string;
      arrondissement?: string;
      additionalInfo?: string;
    };
    industry?: string;
    employeeCount?: number;
  } = {}
): Promise<{ id: string; isNew: boolean }> {
  try {
    // D'abord, chercher si l'entreprise existe déjà
    const searchResult = await findCompanyByName(companyName);
    
    if (searchResult.found && searchResult.company) {
      return { 
        id: searchResult.company.id!, 
        isNew: false 
      };
    }
    
    // Si elle n'existe pas, la créer
    const newCompanyId = await createCompany(companyName, adminId, additionalData);
    
    return { 
      id: newCompanyId, 
      isNew: true 
    };
    
  } catch (error) {
    console.error("Erreur lors de la recherche ou création d'entreprise:", error);
    throw new Error("Impossible de traiter l'entreprise");
  }
} 