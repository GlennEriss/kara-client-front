import { IRepository } from '@/repositories/IRepository'
import type { District } from '../entities/geography.types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class DistrictRepository implements IRepository {
  readonly name = 'DistrictRepository'

  /**
   * Crée un nouvel arrondissement
   */
  async create(data: Omit<District, 'id' | 'createdAt' | 'updatedAt'>): Promise<District> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.districts || 'districts')

      const docData: any = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Nettoyer les valeurs undefined (Firestore ne les accepte pas)
      Object.keys(docData).forEach((key) => {
        if (docData[key] === undefined) {
          delete docData[key]
        }
      })

      const docRef = await addDoc(collectionRef, docData)
      const createdDoc = await this.getById(docRef.id)

      if (!createdDoc) {
        throw new Error('Erreur lors de la récupération de l\'arrondissement créé')
      }

      return createdDoc
    } catch (error) {
      console.error('Erreur lors de la création de l\'arrondissement:', error)
      throw error
    }
  }

  /**
   * Récupère un arrondissement par son ID
   */
  async getById(id: string): Promise<District | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.districts || 'districts', id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        id: snapshot.id,
        communeId: data.communeId || data.cityId, // Support migration depuis cityId
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy ?? undefined,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'arrondissement:', error)
      throw error
    }
  }

  /**
   * Récupère tous les arrondissements d'une commune
   */
  async getByCommuneId(communeId: string): Promise<District[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.districts || 'districts')

      const q = query(
        collectionRef,
        where('communeId', '==', communeId),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      const districts: District[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        districts.push({
          id: doc.id,
          communeId: data.communeId || data.cityId, // Support migration
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return districts
    } catch (error) {
      console.error('Erreur lors de la récupération des arrondissements:', error)
      throw error
    }
  }

  /**
   * Récupère tous les arrondissements (tri alphabétique)
   */
  async getAll(): Promise<District[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.districts || 'districts')

      const q = query(collectionRef, orderBy('name', 'asc'))

      const snapshot = await getDocs(q)
      const districts: District[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        districts.push({
          id: doc.id,
          communeId: data.communeId || data.cityId, // Support migration
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return districts
    } catch (error) {
      console.error('Erreur lors de la récupération des arrondissements:', error)
      throw error
    }
  }

  /**
   * Met à jour un arrondissement
   */
  async update(id: string, data: Partial<Omit<District, 'id' | 'createdAt'>>): Promise<District> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.districts || 'districts', id)

      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      }

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      await updateDoc(docRef, updateData)
      const updatedDoc = await this.getById(id)

      if (!updatedDoc) {
        throw new Error('Erreur lors de la récupération de l\'arrondissement mis à jour')
      }

      return updatedDoc
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'arrondissement:', error)
      throw error
    }
  }

  /**
   * Supprime un arrondissement
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.districts || 'districts', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'arrondissement:', error)
      throw error
    }
  }

  /**
   * Recherche des arrondissements par nom
   */
  async searchByName(searchTerm: string, communeId?: string): Promise<District[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.districts || 'districts')

      let q
      if (communeId) {
        q = query(
          collectionRef,
          where('communeId', '==', communeId),
          orderBy('name', 'asc')
        )
      } else {
        q = query(collectionRef, orderBy('name', 'asc'))
      }

      const snapshot = await getDocs(q)
      const searchLower = searchTerm.toLowerCase()
      const districts: District[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name?.toLowerCase() || ''

        if (name.includes(searchLower)) {
          districts.push({
            id: doc.id,
            communeId: data.communeId || data.cityId, // Support migration
            name: data.name,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            updatedBy: data.updatedBy ?? undefined,
          })
        }
      })

      return districts
    } catch (error) {
      console.error('Erreur lors de la recherche d\'arrondissements:', error)
      throw error
    }
  }
}

