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
    address?: { province?: string; city?: string; district?: string };
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