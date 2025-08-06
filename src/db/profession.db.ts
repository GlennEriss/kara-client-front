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
      createdBy: adminId,
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