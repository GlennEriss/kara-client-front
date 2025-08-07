import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  arrayUnion,
  db as firestore,
  Timestamp
} from '@/firebase/firestore'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'

/**
 * Type pour la structure hiérarchique des adresses
 */
export interface AddressStructure {
  [province: string]: {
    [city: string]: {
      [arrondissement: string]: string[] // Liste des districts sans doublons
    }
  }
}

/**
 * Type pour les données d'adresse d'un utilisateur
 */
export interface UserAddress {
  province: string
  city: string
  district: string
  arrondissement: string
  additionalInfo?: string
}

/**
 * Enregistre une adresse dans la structure hiérarchique
 * Ajoute automatiquement le district à la liste des districts de l'arrondissement
 * 
 * @param address - Les données d'adresse de l'utilisateur
 * @returns {Promise<void>}
 */
export async function registerAddress(address: UserAddress): Promise<void> {
  try {
    const { province, city, district, arrondissement, additionalInfo } = address
    
    // Normaliser les noms (première lettre en majuscule, reste en minuscule)
    const normalizedProvince = province.charAt(0).toUpperCase() + province.slice(1).toLowerCase()
    const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    const normalizedDistrict = district.charAt(0).toUpperCase() + district.slice(1).toLowerCase()
    const normalizedArrondissement = arrondissement.charAt(0).toUpperCase() + arrondissement.slice(1).toLowerCase()
    
    // Récupérer le document address existant ou créer une structure vide
    const addressRef = doc(firestore, FIREBASE_COLLECTION_NAMES.ADDRESSES, 'address')
    const addressDoc = await getDoc(addressRef)
    
    let addressStructure: AddressStructure = {}
    
    if (addressDoc.exists()) {
      addressStructure = addressDoc.data() as AddressStructure
    }
    
    // Initialiser la structure si elle n'existe pas
    if (!addressStructure[normalizedProvince]) {
      addressStructure[normalizedProvince] = {}
    }
    
    if (!addressStructure[normalizedProvince][normalizedCity]) {
      addressStructure[normalizedProvince][normalizedCity] = {}
    }
    
    if (!addressStructure[normalizedProvince][normalizedCity][normalizedArrondissement]) {
      addressStructure[normalizedProvince][normalizedCity][normalizedArrondissement] = []
    }
    
    // Ajouter le district s'il n'est pas déjà présent
    const districts = addressStructure[normalizedProvince][normalizedCity][normalizedArrondissement]
    
    if (!districts.includes(normalizedDistrict)) {
      districts.push(normalizedDistrict)
      // Trier les districts par ordre alphabétique
      districts.sort()
    }
    
    // Sauvegarder la structure mise à jour
    await setDoc(addressRef, {
      ...addressStructure,
      updatedAt: Timestamp.fromDate(new Date())
    })
    
    console.log(`✅ Adresse enregistrée: ${normalizedProvince} > ${normalizedCity} > ${normalizedArrondissement} > ${normalizedDistrict}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement de l\'adresse:', error)
    throw new Error('Impossible d\'enregistrer l\'adresse')
  }
}

/**
 * Récupère la structure complète des adresses
 * 
 * @returns {Promise<AddressStructure>}
 */
export async function getAddressStructure(): Promise<AddressStructure> {
  try {
    const addressRef = doc(firestore, FIREBASE_COLLECTION_NAMES.ADDRESSES, 'address')
    const addressDoc = await getDoc(addressRef)
    
    if (addressDoc.exists()) {
      const data = addressDoc.data()
      // Retirer les champs de métadonnées
      const { updatedAt, ...addressStructure } = data
      return addressStructure as AddressStructure
    }
    
    return {}
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la structure d\'adresses:', error)
    throw new Error('Impossible de récupérer la structure d\'adresses')
  }
}

/**
 * Récupère les villes d'une province
 * 
 * @param province - Nom de la province
 * @returns {Promise<string[]>}
 */
export async function getCitiesByProvince(province: string): Promise<string[]> {
  try {
    const normalizedProvince = province.charAt(0).toUpperCase() + province.slice(1).toLowerCase()
    const addressStructure = await getAddressStructure()
    
    if (addressStructure[normalizedProvince]) {
      return Object.keys(addressStructure[normalizedProvince]).sort()
    }
    
    return []
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des villes:', error)
    throw new Error('Impossible de récupérer les villes')
  }
}

/**
 * Récupère les arrondissements d'une ville
 * 
 * @param province - Nom de la province
 * @param city - Nom de la ville
 * @returns {Promise<string[]>}
 */
export async function getArrondissementsByCity(province: string, city: string): Promise<string[]> {
  try {
    const normalizedProvince = province.charAt(0).toUpperCase() + province.slice(1).toLowerCase()
    const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    const addressStructure = await getAddressStructure()
    
    if (addressStructure[normalizedProvince]?.[normalizedCity]) {
      return Object.keys(addressStructure[normalizedProvince][normalizedCity]).sort()
    }
    
    return []
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des arrondissements:', error)
    throw new Error('Impossible de récupérer les arrondissements')
  }
}

/**
 * Récupère les districts d'un arrondissement
 * 
 * @param province - Nom de la province
 * @param city - Nom de la ville
 * @param arrondissement - Nom de l'arrondissement
 * @returns {Promise<string[]>}
 */
export async function getDistrictsByArrondissement(
  province: string, 
  city: string, 
  arrondissement: string
): Promise<string[]> {
  try {
    const normalizedProvince = province.charAt(0).toUpperCase() + province.slice(1).toLowerCase()
    const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    const normalizedArrondissement = arrondissement.charAt(0).toUpperCase() + arrondissement.slice(1).toLowerCase()
    const addressStructure = await getAddressStructure()
    
    if (addressStructure[normalizedProvince]?.[normalizedCity]?.[normalizedArrondissement]) {
      return [...addressStructure[normalizedProvince][normalizedCity][normalizedArrondissement]].sort()
    }
    
    return []
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des districts:', error)
    throw new Error('Impossible de récupérer les districts')
  }
}

/**
 * Supprime un district d'un arrondissement
 * 
 * @param province - Nom de la province
 * @param city - Nom de la ville
 * @param arrondissement - Nom de l'arrondissement
 * @param district - Nom du district à supprimer
 * @returns {Promise<void>}
 */
export async function removeDistrict(
  province: string, 
  city: string, 
  arrondissement: string, 
  district: string
): Promise<void> {
  try {
    const normalizedProvince = province.charAt(0).toUpperCase() + province.slice(1).toLowerCase()
    const normalizedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    const normalizedArrondissement = arrondissement.charAt(0).toUpperCase() + arrondissement.slice(1).toLowerCase()
    const normalizedDistrict = district.charAt(0).toUpperCase() + district.slice(1).toLowerCase()
    
    const addressRef = doc(firestore, FIREBASE_COLLECTION_NAMES.ADDRESSES, 'address')
    const addressDoc = await getDoc(addressRef)
    
    if (!addressDoc.exists()) {
      throw new Error('Structure d\'adresses non trouvée')
    }
    
    const addressStructure = addressDoc.data() as AddressStructure
    
    if (!addressStructure[normalizedProvince]?.[normalizedCity]?.[normalizedArrondissement]) {
      throw new Error('Arrondissement non trouvé')
    }
    
    const districts = addressStructure[normalizedProvince][normalizedCity][normalizedArrondissement]
    const districtIndex = districts.indexOf(normalizedDistrict)
    
    if (districtIndex === -1) {
      throw new Error('District non trouvé')
    }
    
    // Supprimer le district
    districts.splice(districtIndex, 1)
    
    // Sauvegarder la structure mise à jour
    await setDoc(addressRef, {
      ...addressStructure,
      updatedAt: Timestamp.fromDate(new Date())
    })
    
    console.log(`✅ District supprimé: ${normalizedDistrict} de ${normalizedProvince} > ${normalizedCity} > ${normalizedArrondissement}`)
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du district:', error)
    throw new Error('Impossible de supprimer le district')
  }
} 