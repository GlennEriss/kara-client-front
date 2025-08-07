import { useState, useEffect } from 'react'
import { 
  getAddressStructure, 
  getCitiesByProvince, 
  getArrondissementsByCity, 
  getDistrictsByArrondissement 
} from '@/db/address.db'

export interface AddressData {
  provinces: string[]
  cities: string[]
  arrondissements: string[]
  districts: string[]
}

export const useAddresses = () => {
  const [addressData, setAddressData] = useState<AddressData>({
    provinces: [],
    cities: [],
    arrondissements: [],
    districts: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger toutes les provinces
  const loadProvinces = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const addressStructure = await getAddressStructure()
      const provinces = Object.keys(addressStructure).sort()
      
      setAddressData(prev => ({
        ...prev,
        provinces
      }))
    } catch (err) {
      setError('Erreur lors du chargement des provinces')
      console.error('Erreur useAddresses - loadProvinces:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les villes d'une province
  const loadCities = async (province: string) => {
    if (!province) {
      setAddressData(prev => ({ ...prev, cities: [], arrondissements: [], districts: [] }))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const cities = await getCitiesByProvince(province)
      
      setAddressData(prev => ({
        ...prev,
        cities,
        arrondissements: [],
        districts: []
      }))
    } catch (err) {
      setError('Erreur lors du chargement des villes')
      console.error('Erreur useAddresses - loadCities:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les arrondissements d'une ville
  const loadArrondissements = async (province: string, city: string) => {
    if (!province || !city) {
      setAddressData(prev => ({ ...prev, arrondissements: [], districts: [] }))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const arrondissements = await getArrondissementsByCity(province, city)
      
      setAddressData(prev => ({
        ...prev,
        arrondissements,
        districts: []
      }))
    } catch (err) {
      setError('Erreur lors du chargement des arrondissements')
      console.error('Erreur useAddresses - loadArrondissements:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les districts d'un arrondissement
  const loadDistricts = async (province: string, city: string, arrondissement: string) => {
    if (!province || !city || !arrondissement) {
      setAddressData(prev => ({ ...prev, districts: [] }))
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const districts = await getDistrictsByArrondissement(province, city, arrondissement)
      
      setAddressData(prev => ({
        ...prev,
        districts
      }))
    } catch (err) {
      setError('Erreur lors du chargement des districts')
      console.error('Erreur useAddresses - loadDistricts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les données initiales (provinces)
  useEffect(() => {
    loadProvinces()
  }, [])

  return {
    addressData,
    isLoading,
    error,
    loadProvinces,
    loadCities,
    loadArrondissements,
    loadDistricts
  }
} 