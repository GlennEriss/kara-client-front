import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { FIREBASE_COLLECTION_NAMES } from '@/constantes/firebase-collection-names'
import type { Company } from '@/types/types'

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCompanies = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const companiesRef = collection(db, FIREBASE_COLLECTION_NAMES.COMPANIES)
      const q = query(companiesRef, orderBy('name'))
      const snapshot = await getDocs(q)
      
      const companiesData: Company[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        companiesData.push({
          id: doc.id,
          name: data.name,
          normalizedName: data.normalizedName,
          address: data.address,
          industry: data.industry,
          employeeCount: data.employeeCount,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy
        })
      })
      
      setCompanies(companiesData)
    } catch (err) {
      setError('Erreur lors du chargement des entreprises')
      console.error('Erreur useCompanies:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  return {
    companies,
    isLoading,
    error,
    refetch: loadCompanies
  }
} 