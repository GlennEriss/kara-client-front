import { IRepository } from '../IRepository'
import type { Department } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class DepartmentRepository implements IRepository {
  readonly name = 'DepartmentRepository'

  /**
   * Crée un nouveau département
   */
  async create(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Promise<Department> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.departments || 'departments')

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
        throw new Error('Erreur lors de la récupération du département créé')
      }

      return createdDoc
    } catch (error) {
      console.error('Erreur lors de la création du département:', error)
      throw error
    }
  }

  /**
   * Récupère un département par son ID
   */
  async getById(id: string): Promise<Department | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.departments || 'departments', id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        id: snapshot.id,
        provinceId: data.provinceId,
        name: data.name,
        code: data.code ?? undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy ?? undefined,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du département:', error)
      throw error
    }
  }

  /**
   * Récupère tous les départements d'une province
   */
  async getByProvinceId(provinceId: string): Promise<Department[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.departments || 'departments')

      const q = query(
        collectionRef,
        where('provinceId', '==', provinceId),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      const departments: Department[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        departments.push({
          id: doc.id,
          provinceId: data.provinceId,
          name: data.name,
          code: data.code ?? undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return departments
    } catch (error) {
      console.error('Erreur lors de la récupération des départements:', error)
      throw error
    }
  }

  /**
   * Récupère tous les départements
   */
  async getAll(): Promise<Department[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.departments || 'departments')

      const q = query(collectionRef, orderBy('name', 'asc'))

      const snapshot = await getDocs(q)
      const departments: Department[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        departments.push({
          id: doc.id,
          provinceId: data.provinceId,
          name: data.name,
          code: data.code ?? undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return departments
    } catch (error) {
      console.error('Erreur lors de la récupération des départements:', error)
      throw error
    }
  }

  /**
   * Met à jour un département
   */
  async update(id: string, data: Partial<Omit<Department, 'id' | 'createdAt'>>): Promise<Department> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.departments || 'departments', id)

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
        throw new Error('Erreur lors de la récupération du département mis à jour')
      }

      return updatedDoc
    } catch (error) {
      console.error('Erreur lors de la mise à jour du département:', error)
      throw error
    }
  }

  /**
   * Supprime un département
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.departments || 'departments', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression du département:', error)
      throw error
    }
  }

  /**
   * Recherche des départements par nom
   */
  async searchByName(searchTerm: string, provinceId?: string): Promise<Department[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.departments || 'departments')

      let q
      if (provinceId) {
        q = query(
          collectionRef,
          where('provinceId', '==', provinceId),
          orderBy('name', 'asc')
        )
      } else {
        q = query(collectionRef, orderBy('name', 'asc'))
      }

      const snapshot = await getDocs(q)
      const searchLower = searchTerm.toLowerCase()
      const departments: Department[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name?.toLowerCase() || ''
        const code = data.code?.toLowerCase() || ''

        if (name.includes(searchLower) || code.includes(searchLower)) {
          departments.push({
            id: doc.id,
            provinceId: data.provinceId,
            name: data.name,
            code: data.code ?? undefined,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            updatedBy: data.updatedBy ?? undefined,
          })
        }
      })

      return departments
    } catch (error) {
      console.error('Erreur lors de la recherche de départements:', error)
      throw error
    }
  }
}

