import { IRepository } from '../IRepository'
import type { Province } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class ProvinceRepository implements IRepository {
  readonly name = 'ProvinceRepository'

  /**
   * Crée une nouvelle province
   */
  async create(data: Omit<Province, 'id' | 'createdAt' | 'updatedAt'>): Promise<Province> {
    try {
      const { collection, addDoc, db, Timestamp, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.provinces || 'provinces')

      const now = new Date()
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
        throw new Error('Erreur lors de la récupération de la province créée')
      }

      return createdDoc
    } catch (error) {
      console.error('Erreur lors de la création de la province:', error)
      throw error
    }
  }

  /**
   * Récupère une province par son ID
   */
  async getById(id: string): Promise<Province | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.provinces || 'provinces', id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        id: snapshot.id,
        code: data.code,
        name: data.name,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy ?? undefined,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la province:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les provinces (tri alphabétique)
   */
  async getAll(): Promise<Province[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.provinces || 'provinces')

      const q = query(collectionRef, orderBy('name', 'asc'))

      const snapshot = await getDocs(q)
      const provinces: Province[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        provinces.push({
          id: doc.id,
          code: data.code,
          name: data.name,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return provinces
    } catch (error) {
      console.error('Erreur lors de la récupération des provinces:', error)
      throw error
    }
  }

  /**
   * Met à jour une province
   */
  async update(id: string, data: Partial<Omit<Province, 'id' | 'createdAt'>>): Promise<Province> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.provinces || 'provinces', id)

      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      }

      // Nettoyer les valeurs undefined
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      await updateDoc(docRef, updateData)
      const updatedDoc = await this.getById(id)

      if (!updatedDoc) {
        throw new Error('Erreur lors de la récupération de la province mise à jour')
      }

      return updatedDoc
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la province:', error)
      throw error
    }
  }

  /**
   * Supprime une province
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.provinces || 'provinces', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression de la province:', error)
      throw error
    }
  }

  /**
   * Recherche des provinces par nom
   */
  async searchByName(searchTerm: string): Promise<Province[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.provinces || 'provinces')

      // Recherche insensible à la casse (Firestore ne supporte pas directement, on filtre côté client)
      const q = query(collectionRef, orderBy('name', 'asc'))
      const snapshot = await getDocs(q)

      const searchLower = searchTerm.toLowerCase()
      const provinces: Province[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name?.toLowerCase() || ''
        const code = data.code?.toLowerCase() || ''

        if (name.includes(searchLower) || code.includes(searchLower)) {
          provinces.push({
            id: doc.id,
            code: data.code,
            name: data.name,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            updatedBy: data.updatedBy ?? undefined,
          })
        }
      })

      return provinces
    } catch (error) {
      console.error('Erreur lors de la recherche de provinces:', error)
      throw error
    }
  }
}

