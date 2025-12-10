import { IRepository } from '../IRepository'
import type { Quarter } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class QuarterRepository implements IRepository {
  readonly name = 'QuarterRepository'

  /**
   * Crée un nouveau quartier
   */
  async create(data: Omit<Quarter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quarter> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.quarters || 'quarters')

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
        throw new Error('Erreur lors de la récupération du quartier créé')
      }

      return createdDoc
    } catch (error) {
      console.error('Erreur lors de la création du quartier:', error)
      throw error
    }
  }

  /**
   * Récupère un quartier par son ID
   */
  async getById(id: string): Promise<Quarter | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.quarters || 'quarters', id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        id: snapshot.id,
        districtId: data.districtId,
        name: data.name,
        displayOrder: data.displayOrder ?? null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy ?? null,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du quartier:', error)
      throw error
    }
  }

  /**
   * Récupère tous les quartiers d'un arrondissement
   */
  async getByDistrictId(districtId: string, orderByField: 'name' | 'displayOrder' = 'displayOrder'): Promise<Quarter[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.quarters || 'quarters')

      // Toujours trier par 'name' dans Firestore car displayOrder peut être absent
      // On fera le tri par displayOrder côté client si nécessaire
      const q = query(
        collectionRef,
        where('districtId', '==', districtId),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      const quarters: Quarter[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        quarters.push({
          id: doc.id,
          districtId: data.districtId,
          name: data.name,
          displayOrder: data.displayOrder ?? null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? null,
        })
      })

      // Trier côté client si nécessaire
      if (orderByField === 'displayOrder') {
        quarters.sort((a, b) => {
          // Les éléments avec displayOrder en premier
          const aOrder = a.displayOrder ?? undefined
          const bOrder = b.displayOrder ?? undefined
          if (aOrder !== undefined && bOrder !== undefined) {
            if (aOrder !== bOrder) {
              return aOrder - bOrder
            }
          } else if (aOrder !== undefined) {
            return -1
          } else if (bOrder !== undefined) {
            return 1
          }
          // Si les deux n'ont pas de displayOrder, trier par nom
          return a.name.localeCompare(b.name)
        })
      }

      return quarters
    } catch (error) {
      console.error('Erreur lors de la récupération des quartiers:', error)
      throw error
    }
  }

  /**
   * Récupère tous les quartiers
   */
  async getAll(orderByField: 'name' | 'displayOrder' = 'displayOrder'): Promise<Quarter[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.quarters || 'quarters')

      // Toujours trier par 'name' dans Firestore car displayOrder peut être absent
      // On fera le tri par displayOrder côté client si nécessaire
      const q = query(collectionRef, orderBy('name', 'asc'))

      const snapshot = await getDocs(q)
      const quarters: Quarter[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        quarters.push({
          id: doc.id,
          districtId: data.districtId,
          name: data.name,
          displayOrder: data.displayOrder ?? null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? null,
        })
      })

      // Trier côté client si nécessaire
      if (orderByField === 'displayOrder') {
        quarters.sort((a, b) => {
          // Les éléments avec displayOrder en premier
          const aOrder = a.displayOrder ?? undefined
          const bOrder = b.displayOrder ?? undefined
          if (aOrder !== undefined && bOrder !== undefined) {
            if (aOrder !== bOrder) {
              return aOrder - bOrder
            }
          } else if (aOrder !== undefined) {
            return -1
          } else if (bOrder !== undefined) {
            return 1
          }
          // Si les deux n'ont pas de displayOrder, trier par nom
          return a.name.localeCompare(b.name)
        })
      }

      return quarters
    } catch (error) {
      console.error('Erreur lors de la récupération des quartiers:', error)
      throw error
    }
  }

  /**
   * Met à jour un quartier
   */
  async update(id: string, data: Partial<Omit<Quarter, 'id' | 'createdAt'>>): Promise<Quarter> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.quarters || 'quarters', id)

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
        throw new Error('Erreur lors de la récupération du quartier mis à jour')
      }

      return updatedDoc
    } catch (error) {
      console.error('Erreur lors de la mise à jour du quartier:', error)
      throw error
    }
  }

  /**
   * Supprime un quartier
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.quarters || 'quarters', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression du quartier:', error)
      throw error
    }
  }

  /**
   * Recherche des quartiers par nom
   */
  async searchByName(searchTerm: string, districtId?: string): Promise<Quarter[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.quarters || 'quarters')

      let q
      if (districtId) {
        q = query(
          collectionRef,
          where('districtId', '==', districtId),
          orderBy('name', 'asc')
        )
      } else {
        q = query(collectionRef, orderBy('name', 'asc'))
      }

      const snapshot = await getDocs(q)
      const searchLower = searchTerm.toLowerCase()
      const quarters: Quarter[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name?.toLowerCase() || ''

        if (name.includes(searchLower)) {
          quarters.push({
            id: doc.id,
            districtId: data.districtId,
            name: data.name,
            displayOrder: data.displayOrder ?? null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            updatedBy: data.updatedBy ?? null,
          })
        }
      })

      return quarters
    } catch (error) {
      console.error('Erreur lors de la recherche de quartiers:', error)
      throw error
    }
  }
}

