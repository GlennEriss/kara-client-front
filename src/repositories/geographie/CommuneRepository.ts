import { IRepository } from '../IRepository'
import type { Commune } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class CommuneRepository implements IRepository {
  readonly name = 'CommuneRepository'

  /**
   * Crée une nouvelle commune
   */
  async create(data: Omit<Commune, 'id' | 'createdAt' | 'updatedAt'>): Promise<Commune> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.communes || 'communes')

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
        throw new Error('Erreur lors de la récupération de la commune créée')
      }

      return createdDoc
    } catch (error) {
      console.error('Erreur lors de la création de la commune:', error)
      throw error
    }
  }

  /**
   * Récupère une commune par son ID
   */
  async getById(id: string): Promise<Commune | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.communes || 'communes', id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        id: snapshot.id,
        departmentId: data.departmentId,
        name: data.name,
        postalCode: data.postalCode ?? undefined,
        alias: data.alias ?? undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy ?? undefined,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la commune:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les communes d'un département
   */
  async getByDepartmentId(departmentId: string): Promise<Commune[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.communes || 'communes')

      const q = query(
        collectionRef,
        where('departmentId', '==', departmentId),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      const communes: Commune[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        communes.push({
          id: doc.id,
          departmentId: data.departmentId,
          name: data.name,
          postalCode: data.postalCode ?? undefined,
          alias: data.alias ?? undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return communes
    } catch (error) {
      console.error('Erreur lors de la récupération des communes:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les communes
   */
  async getAll(): Promise<Commune[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.communes || 'communes')

      const q = query(collectionRef, orderBy('name', 'asc'))

      const snapshot = await getDocs(q)
      const communes: Commune[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        communes.push({
          id: doc.id,
          departmentId: data.departmentId,
          name: data.name,
          postalCode: data.postalCode ?? undefined,
          alias: data.alias ?? undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? undefined,
        })
      })

      return communes
    } catch (error) {
      console.error('Erreur lors de la récupération des communes:', error)
      throw error
    }
  }

  /**
   * Met à jour une commune
   */
  async update(id: string, data: Partial<Omit<Commune, 'id' | 'createdAt'>>): Promise<Commune> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.communes || 'communes', id)

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
        throw new Error('Erreur lors de la récupération de la commune mise à jour')
      }

      return updatedDoc
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la commune:', error)
      throw error
    }
  }

  /**
   * Supprime une commune
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.communes || 'communes', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression de la commune:', error)
      throw error
    }
  }

  /**
   * Recherche des communes par nom
   */
  async searchByName(searchTerm: string, departmentId?: string): Promise<Commune[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.communes || 'communes')

      let q
      if (departmentId) {
        q = query(
          collectionRef,
          where('departmentId', '==', departmentId),
          orderBy('name', 'asc')
        )
      } else {
        q = query(collectionRef, orderBy('name', 'asc'))
      }

      const snapshot = await getDocs(q)
      const searchLower = searchTerm.toLowerCase()
      const communes: Commune[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name?.toLowerCase() || ''

        if (name.includes(searchLower)) {
          communes.push({
            id: doc.id,
            departmentId: data.departmentId,
            name: data.name,
            postalCode: data.postalCode ?? undefined,
            alias: data.alias ?? undefined,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            updatedBy: data.updatedBy ?? undefined,
          })
        }
      })

      return communes
    } catch (error) {
      console.error('Erreur lors de la recherche de communes:', error)
      throw error
    }
  }
}

