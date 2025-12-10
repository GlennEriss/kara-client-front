import { IRepository } from '../IRepository'
import type { City } from '@/types/types'
import { firebaseCollectionNames } from '@/constantes/firebase-collection-names'

const getFirestore = () => import('@/firebase/firestore')

export class CityRepository implements IRepository {
  readonly name = 'CityRepository'

  /**
   * Crée une nouvelle ville
   */
  async create(data: Omit<City, 'id' | 'createdAt' | 'updatedAt'>): Promise<City> {
    try {
      const { collection, addDoc, db, serverTimestamp } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.cities || 'cities')

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
        throw new Error('Erreur lors de la récupération de la ville créée')
      }

      return createdDoc
    } catch (error) {
      console.error('Erreur lors de la création de la ville:', error)
      throw error
    }
  }

  /**
   * Récupère une ville par son ID
   */
  async getById(id: string): Promise<City | null> {
    try {
      const { doc, getDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.cities || 'cities', id)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        return null
      }

      const data = snapshot.data()
      return {
        id: snapshot.id,
        provinceId: data.provinceId,
        name: data.name,
        postalCode: data.postalCode ?? null,
        displayOrder: data.displayOrder ?? null,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy ?? null,
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la ville:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les villes d'une province
   */
  async getByProvinceId(provinceId: string, orderByField: 'name' | 'displayOrder' = 'displayOrder'): Promise<City[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.cities || 'cities')

      // Toujours trier par 'name' dans Firestore car displayOrder peut être absent
      // On fera le tri par displayOrder côté client si nécessaire
      const q = query(
        collectionRef,
        where('provinceId', '==', provinceId),
        orderBy('name', 'asc')
      )

      const snapshot = await getDocs(q)
      const cities: City[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        cities.push({
          id: doc.id,
          provinceId: data.provinceId,
          name: data.name,
          postalCode: data.postalCode ?? null,
          displayOrder: data.displayOrder ?? null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? null,
        })
      })

      // Trier côté client si nécessaire
      if (orderByField === 'displayOrder') {
        cities.sort((a, b) => {
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

      return cities
    } catch (error) {
      console.error('Erreur lors de la récupération des villes:', error)
      throw error
    }
  }

  /**
   * Récupère toutes les villes
   */
  async getAll(orderByField: 'name' | 'displayOrder' = 'displayOrder'): Promise<City[]> {
    try {
      const { collection, query, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.cities || 'cities')

      // Toujours trier par 'name' dans Firestore car displayOrder peut être absent
      // On fera le tri par displayOrder côté client si nécessaire
      const q = query(collectionRef, orderBy('name', 'asc'))

      const snapshot = await getDocs(q)
      const cities: City[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        cities.push({
          id: doc.id,
          provinceId: data.provinceId,
          name: data.name,
          postalCode: data.postalCode ?? null,
          displayOrder: data.displayOrder ?? null,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedBy: data.updatedBy ?? null,
        })
      })

      // Trier côté client si nécessaire
      if (orderByField === 'displayOrder') {
        cities.sort((a, b) => {
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

      return cities
    } catch (error) {
      console.error('Erreur lors de la récupération des villes:', error)
      throw error
    }
  }

  /**
   * Met à jour une ville
   */
  async update(id: string, data: Partial<Omit<City, 'id' | 'createdAt'>>): Promise<City> {
    try {
      const { doc, updateDoc, db, serverTimestamp } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.cities || 'cities', id)

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
        throw new Error('Erreur lors de la récupération de la ville mise à jour')
      }

      return updatedDoc
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la ville:', error)
      throw error
    }
  }

  /**
   * Supprime une ville
   */
  async delete(id: string): Promise<void> {
    try {
      const { doc, deleteDoc, db } = await getFirestore()
      const docRef = doc(db, firebaseCollectionNames.cities || 'cities', id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Erreur lors de la suppression de la ville:', error)
      throw error
    }
  }

  /**
   * Recherche des villes par nom
   */
  async searchByName(searchTerm: string, provinceId?: string): Promise<City[]> {
    try {
      const { collection, query, where, orderBy, getDocs, db } = await getFirestore()
      const collectionRef = collection(db, firebaseCollectionNames.cities || 'cities')

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
      const cities: City[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        const name = data.name?.toLowerCase() || ''

        if (name.includes(searchLower)) {
          cities.push({
            id: doc.id,
            provinceId: data.provinceId,
            name: data.name,
            postalCode: data.postalCode ?? null,
            displayOrder: data.displayOrder ?? null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdBy: data.createdBy,
            updatedBy: data.updatedBy ?? null,
          })
        }
      })

      return cities
    } catch (error) {
      console.error('Erreur lors de la recherche de villes:', error)
      throw error
    }
  }
}

