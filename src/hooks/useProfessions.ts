import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'
import type { Profession } from '@/types/types'

export const useProfessions = () => {
  const [professions, setProfessions] = useState<Profession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProfessions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const professionsRef = collection(db, FIREBASE_COLLECTION_NAMES.PROFESSIONS)
      const q = query(professionsRef, orderBy('name'))
      const snapshot = await getDocs(q)
      
      const professionsData: Profession[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        professionsData.push({
          id: doc.id,
          name: data.name,
          normalizedName: data.normalizedName,
          category: data.category,
          description: data.description,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        })
      })
      
      setProfessions(professionsData)
    } catch (err) {
      setError('Erreur lors du chargement des professions')
      console.error('Erreur useProfessions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfessions()
  }, [])

  return {
    professions,
    isLoading,
    error,
    refetch: loadProfessions
  }
} 