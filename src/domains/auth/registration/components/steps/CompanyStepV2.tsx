'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { 
  Briefcase, 
  Building2, 
  GraduationCap, 
  Clock, 
  Coffee, 
  Check, 
  MapPin,
  Search,
  Loader2,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Plus,
  MapPinIcon,
  Home,
  Landmark,
  Navigation,
  TreePine
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { RegisterFormData } from '@/schemas/schemas'
import { useIsAdminContext } from '@/hooks/useIsAdminContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useProvinces, useDepartments, useDistricts, useQuarters } from '@/domains/infrastructure/geography/hooks/useGeographie'
import { useQueries } from '@tanstack/react-query'
import type { Commune } from '@/domains/infrastructure/geography/entities/geography.types'
import CompanyCombobox from '@/domains/infrastructure/references/components/forms/CompanyCombobox'
import AddCompanyModal from '@/domains/infrastructure/references/components/forms/AddCompanyModal'
import ProfessionCombobox from '@/domains/infrastructure/references/components/forms/ProfessionCombobox'
import AddProfessionModal from '@/domains/infrastructure/references/components/forms/AddProfessionModal'
import AddProvinceModal from '@/domains/infrastructure/geography/components/modals/AddProvinceModal'
import AddCommuneModal from '@/domains/infrastructure/geography/components/modals/AddCommuneModal'
import AddDistrictModal from '@/domains/infrastructure/geography/components/modals/AddDistrictModal'
import AddQuarterModal from '@/domains/infrastructure/geography/components/modals/AddQuarterModal'
import type { Province, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'

const SENIORITY_OPTIONS = [
  '6 mois', '1 an', '2 ans', '3 ans', '5 ans', '10 ans', '15 ans', '20 ans'
]

// Interface pour les résultats Photon
interface PhotonResult {
  properties: {
    name: string
    city?: string
    state?: string
    country: string
    district?: string
    suburb?: string
    neighbourhood?: string
    osm_key: string
    osm_value: string
    type?: string
  }
  geometry: {
    coordinates: [number, number]
  }
}

// Hook pour debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value ?? '')

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value ?? '')
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue ?? ''
}

export default function CompanyStepV2() {
  const form = useFormContext<RegisterFormData>()
  const { register, watch, setValue, formState: { errors, isSubmitted, touchedFields }, clearErrors } = form
  
  const isAdminContext = useIsAdminContext()
  const queryClient = useQueryClient()
  
  const isEmployed = watch('company.isEmployed')
  const selectedSeniority = watch('company.seniority')
  
  // Tab actif - persistant dans le formulaire
  // Note: Utilisation de 'as any' car le champ est ajouté au schéma
  const addressTabFromForm = (watch as any)('company.companyAddress.source') as 'database' | 'photon' | undefined
  const [addressTab, setAddressTab] = useState<'database' | 'photon'>(addressTabFromForm || 'database')
  
  // Initialiser le tab depuis le formulaire au montage (une seule fois)
  useEffect(() => {
    if (addressTabFromForm && addressTabFromForm !== addressTab) {
      setAddressTab(addressTabFromForm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Seulement au montage
  
  // Sauvegarder le tab dans le formulaire quand il change
  useEffect(() => {
    if (setValue && typeof setValue === 'function') {
      ;(setValue as any)('company.companyAddress.source', addressTab, { shouldValidate: false })
    }
  }, [addressTab, setValue])
  
  // États pour les modals
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false)
  const [showAddProfessionModal, setShowAddProfessionModal] = useState(false)
  const [showAddCompanyProvinceModal, setShowAddCompanyProvinceModal] = useState(false)
  const [showAddCompanyCommuneModal, setShowAddCompanyCommuneModal] = useState(false)
  const [showAddCompanyDistrictModal, setShowAddCompanyDistrictModal] = useState(false)
  const [showAddCompanyQuarterModal, setShowAddCompanyQuarterModal] = useState(false)
  
  // États pour la géolocalisation de l'entreprise (Photon)
  const [companyDistrictQuery, setCompanyDistrictQuery] = useState('')
  const [companySearchResults, setCompanySearchResults] = useState<PhotonResult[]>([])
  const [isSearchingCompany, setIsSearchingCompany] = useState(false)
  const [showCompanyResults, setShowCompanyResults] = useState(false)
  const [selectedCompanyLocation, setSelectedCompanyLocation] = useState<PhotonResult | null>(null)
  
  // États pour la correction de ville de l'entreprise
  const [needsCompanyCityCorrection, setNeedsCompanyCityCorrection] = useState(false)
  const [companyCityQuery, setCompanyCityQuery] = useState('')
  const [companyCitySearchResults, setCompanyCitySearchResults] = useState<PhotonResult[]>([])
  const [isSearchingCompanyCity, setIsSearchingCompanyCity] = useState(false)
  const [showCompanyCityResults, setShowCompanyCityResults] = useState(false)
  const [detectedCompanyCityName, setDetectedCompanyCityName] = useState('')
  
  // IDs pour l'adresse basée sur la BD - stockés dans le formulaire pour persistance
  // Note: Utilisation de 'as any' car les nouveaux champs sont ajoutés au schéma
  const selectedCompanyProvinceId = (watch as any)('company.companyAddress.provinceId') || ''
  const selectedCompanyCommuneId = (watch as any)('company.companyAddress.communeId') || ''
  const selectedCompanyDistrictId = (watch as any)('company.companyAddress.districtId') || ''
  const selectedCompanyQuarterId = (watch as any)('company.companyAddress.quarterId') || ''
  
  // Charger les provinces pour l'adresse entreprise
  const { data: companyProvinces = [], isLoading: isLoadingCompanyProvinces } = useProvinces()
  
  const sortedCompanyProvinces = useMemo(() => {
    return [...companyProvinces]
      .filter(p => !p.name.toLowerCase().includes('test e2e') && !p.name.toLowerCase().includes('test'))
      .sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
  }, [companyProvinces])
  
  // Charger les départements de la province sélectionnée
  const { data: companyDepartments = [], isLoading: isLoadingCompanyDepartments } = useDepartments(
    selectedCompanyProvinceId || undefined
  )
  
  // Charger toutes les communes de tous les départements
  const companyCommuneQueries = useQueries({
    queries: companyDepartments.length > 0 
      ? companyDepartments.map(dept => ({
          queryKey: ['communes', dept.id, 'company'],
          queryFn: async () => {
            const service = ServiceFactory.getGeographieService()
            return service.getCommunesByDepartmentId(dept.id)
          },
          enabled: !!selectedCompanyProvinceId && companyDepartments.length > 0,
          staleTime: 5 * 60 * 1000,
        }))
      : []
  })
  
  const allCompanyCommunes = useMemo(() => {
    const communes: Commune[] = []
    companyCommuneQueries.forEach(query => {
      if (query.data) {
        communes.push(...query.data)
      }
    })
    const uniqueCommunes = communes.filter((commune, index, self) =>
      index === self.findIndex(c => c.id === commune.id)
    )
    return uniqueCommunes
      .filter(c => !c.name.toLowerCase().includes('test e2e') && !c.name.toLowerCase().includes('test'))
      .sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
  }, [companyCommuneQueries])
  
  const isLoadingCompanyCommunes = companyCommuneQueries.some(query => query.isLoading)
  
  // Charger les arrondissements (districts)
  const { data: companyDistricts = [], isLoading: isLoadingCompanyDistricts } = useDistricts(
    selectedCompanyCommuneId || undefined
  )
  
  const sortedCompanyDistricts = useMemo(() => {
    return [...companyDistricts]
      .filter(d => !d.name.toLowerCase().includes('test e2e') && !d.name.toLowerCase().includes('test'))
      .sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
  }, [companyDistricts])
  
  // Charger les quartiers (quarters)
  const { data: companyQuarters = [], isLoading: isLoadingCompanyQuarters } = useQuarters(
    selectedCompanyDistrictId || undefined
  )
  
  const sortedCompanyQuarters = useMemo(() => {
    return [...companyQuarters]
      .filter(q => !q.name.toLowerCase().includes('test e2e') && !q.name.toLowerCase().includes('test'))
      .sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      )
  }, [companyQuarters])
  
  // Trouver les objets complets pour remplir les champs texte
  const selectedCompanyProvince = sortedCompanyProvinces.find(p => p.id === selectedCompanyProvinceId)
  const selectedCompanyCommune = allCompanyCommunes.find(c => c.id === selectedCompanyCommuneId)
  const selectedCompanyDistrict = sortedCompanyDistricts.find(d => d.id === selectedCompanyDistrictId)
  const selectedCompanyQuarter = sortedCompanyQuarters.find(q => q.id === selectedCompanyQuarterId)
  
  // Les IDs sont maintenant stockés dans le formulaire, pas besoin d'initialisation depuis les noms
  // La persistance est automatique grâce à React Hook Form
  
  // Mettre à jour les champs texte quand les sélections changent (BD)
  useEffect(() => {
    if (addressTab === 'database' && setValue && typeof setValue === 'function') {
      if (selectedCompanyProvince) {
        setValue('company.companyAddress.province', selectedCompanyProvince.name, { shouldValidate: true })
      } else if (!selectedCompanyProvinceId) {
        setValue('company.companyAddress.province', '', { shouldValidate: true })
      }
    }
  }, [selectedCompanyProvince, selectedCompanyProvinceId, setValue, addressTab])
  
  useEffect(() => {
    if (addressTab === 'database' && setValue && typeof setValue === 'function') {
      if (selectedCompanyCommune) {
        setValue('company.companyAddress.city', selectedCompanyCommune.name, { shouldValidate: true })
      } else if (!selectedCompanyCommuneId) {
        setValue('company.companyAddress.city', '', { shouldValidate: true })
        setValue('company.companyAddress.district', '', { shouldValidate: true })
      }
    }
  }, [selectedCompanyCommune, selectedCompanyCommuneId, setValue, addressTab])
  
  useEffect(() => {
    if (addressTab === 'database' && setValue && typeof setValue === 'function') {
      if (selectedCompanyDistrict) {
        if (!selectedCompanyQuarterId) {
          setValue('company.companyAddress.district', selectedCompanyDistrict.name, { shouldValidate: true })
        }
      } else if (!selectedCompanyDistrictId) {
        if (!selectedCompanyQuarterId) {
          setValue('company.companyAddress.district', '', { shouldValidate: true })
        }
      }
    }
  }, [selectedCompanyDistrict, selectedCompanyDistrictId, setValue, addressTab, selectedCompanyQuarterId])
  
  useEffect(() => {
    if (addressTab === 'database' && setValue && typeof setValue === 'function') {
      if (selectedCompanyQuarter) {
        setValue('company.companyAddress.district', selectedCompanyQuarter.name, { shouldValidate: true })
      } else if (!selectedCompanyQuarterId) {
        if (!selectedCompanyDistrictId) {
          setValue('company.companyAddress.district', '', { shouldValidate: true })
        }
      }
    }
  }, [selectedCompanyQuarter, selectedCompanyQuarterId, setValue, addressTab, selectedCompanyDistrictId])
  
  // Handlers pour les modals de création
  const handleCompanyCreated = (companyName: string) => {
    queryClient.invalidateQueries({ queryKey: ['companies'] })
    setValue('company.companyName', companyName, { shouldValidate: true })
    toast.success(`Entreprise "${companyName}" créée et sélectionnée`)
  }
  
  const handleProfessionCreated = (professionName: string) => {
    queryClient.invalidateQueries({ queryKey: ['professions'] })
    setValue('company.profession', professionName, { shouldValidate: true })
    toast.success(`Profession "${professionName}" créée et sélectionnée`)
  }
  
  const handleCompanyProvinceCreated = (newProvince: Province) => {
    queryClient.invalidateQueries({ queryKey: ['provinces'] })
    ;(setValue as any)('company.companyAddress.provinceId', newProvince.id, { shouldValidate: true })
    toast.success(`Province "${newProvince.name}" créée et sélectionnée`)
  }
  
  const handleCompanyCommuneCreated = (newCommune: Commune) => {
    queryClient.invalidateQueries({ queryKey: ['communes'] })
    ;(setValue as any)('company.companyAddress.communeId', newCommune.id, { shouldValidate: true })
    toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
  }
  
  const handleCompanyDistrictCreated = (_newDistricts: any[]) => {
    queryClient.invalidateQueries({ queryKey: ['districts'] })
    toast.success('Arrondissements créés avec succès')
  }
  
  const handleCompanyQuarterCreated = (newQuarter: Quarter) => {
    queryClient.invalidateQueries({ queryKey: ['quarters'] })
    ;(setValue as any)('company.companyAddress.quarterId', newQuarter.id, { shouldValidate: true })
    toast.success(`Quartier "${newQuarter.name}" créé et sélectionné`)
  }
  
  // Handlers de changement cascade (BD) - stockent les IDs dans le formulaire
  const handleCompanyProvinceChange = (provinceId: string) => {
    (setValue as any)('company.companyAddress.provinceId', provinceId, { shouldValidate: true })
    // Réinitialiser les niveaux inférieurs
    (setValue as any)('company.companyAddress.communeId', '', { shouldValidate: true })
    (setValue as any)('company.companyAddress.districtId', '', { shouldValidate: true })
    (setValue as any)('company.companyAddress.quarterId', '', { shouldValidate: true })
  }
  
  const handleCompanyCommuneChange = (communeId: string) => {
    (setValue as any)('company.companyAddress.communeId', communeId, { shouldValidate: true })
    // Réinitialiser les niveaux inférieurs
    (setValue as any)('company.companyAddress.districtId', '', { shouldValidate: true })
    (setValue as any)('company.companyAddress.quarterId', '', { shouldValidate: true })
  }
  
  const handleCompanyDistrictChange = (districtId: string) => {
    (setValue as any)('company.companyAddress.districtId', districtId, { shouldValidate: true })
    // Réinitialiser le quartier
    (setValue as any)('company.companyAddress.quarterId', '', { shouldValidate: true })
  }
  
  const handleCompanyQuarterChange = (quarterId: string) => {
    (setValue as any)('company.companyAddress.quarterId', quarterId, { shouldValidate: true })
  }
  
  // Réhydrater les données Photon depuis le formulaire au montage ou quand on revient sur l'onglet Photon
  useEffect(() => {
    // Ne réhydrater que si on est en mode Photon et qu'il n'y a pas déjà de sélection
    if (addressTab === 'photon' && !selectedCompanyLocation) {
      const companyDistrict = watch('company.companyAddress.district')
      const companyCity = watch('company.companyAddress.city')
      const companyProvince = watch('company.companyAddress.province')
      
      // Si le formulaire contient déjà des valeurs (sauvegardées précédemment)
      if (companyDistrict && companyDistrict.trim().length > 0) {
        // Réhydrater la query
        setCompanyDistrictQuery(companyDistrict)
        
        // Créer un objet PhotonResult minimal pour réafficher "localisation détectée"
        const restoredLocation: PhotonResult = {
          properties: {
            name: companyDistrict,
            city: companyCity || '',
            state: companyProvince || '',
            country: 'Gabon',
            osm_key: 'place',
            osm_value: 'neighbourhood',
            type: 'neighbourhood'
          },
          geometry: {
            coordinates: [0, 0] // Coordonnées non disponibles, mais nécessaires pour le type
          }
        }
        
        setSelectedCompanyLocation(restoredLocation)
        
        // Si la ville correspond au district, c'est probablement une correction nécessaire
        if (companyCity && companyCity === companyDistrict) {
          setDetectedCompanyCityName(companyCity)
          setNeedsCompanyCityCorrection(true)
        } else {
          setNeedsCompanyCityCorrection(false)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressTab]) // Seulement quand le tab change vers Photon
  
  // Nettoyer les données Photon quand on passe à l'onglet BD
  useEffect(() => {
    if (addressTab === 'database') {
      setCompanyDistrictQuery('')
      setCompanySearchResults([])
      setSelectedCompanyLocation(null)
      setNeedsCompanyCityCorrection(false)
      setCompanyCityQuery('')
      setCompanyCitySearchResults([])
    }
  }, [addressTab])
  
  // Nettoyer les données BD quand on passe à l'onglet Photon
  useEffect(() => {
    if (addressTab === 'photon' && setValue && typeof setValue === 'function') {
      (setValue as any)('company.companyAddress.provinceId', '', { shouldValidate: true })
      ;(setValue as any)('company.companyAddress.communeId', '', { shouldValidate: true })
      ;(setValue as any)('company.companyAddress.districtId', '', { shouldValidate: true })
      ;(setValue as any)('company.companyAddress.quarterId', '', { shouldValidate: true })
    }
  }, [addressTab, setValue])
  
  // Debounce pour la recherche d'entreprise
  const debouncedCompanyQuery = useDebounce(companyDistrictQuery, 500)
  const debouncedCompanyCityQuery = useDebounce(companyCityQuery, 500)
  
  // Fonction pour rechercher avec Photon API pour l'entreprise
  const searchCompanyWithPhoton = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCompanySearchResults([])
      return
    }
    
    setIsSearchingCompany(true)
    try {
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        const gabonResults = data.features.filter((result: PhotonResult) => 
          result.properties.country === 'Gabon' || result.properties.country === 'GA'
        )
        setCompanySearchResults(gabonResults)
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Photon pour l\'entreprise:', error)
      setCompanySearchResults([])
    } finally {
      setIsSearchingCompany(false)
    }
  }, [])
  
  // Fonction pour rechercher uniquement les villes pour l'entreprise
  const searchCompanyCitiesWithPhoton = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCompanyCitySearchResults([])
      return
    }
    
    setIsSearchingCompanyCity(true)
    try {
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        const cityResults = data.features.filter((result: PhotonResult) => 
          (result.properties.country === 'Gabon' || result.properties.country === 'GA') &&
          (result.properties.osm_key === 'place' && 
           ['city', 'town', 'municipality'].includes(result.properties.osm_value))
        )
        setCompanyCitySearchResults(cityResults)
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de villes pour l\'entreprise:', error)
      setCompanyCitySearchResults([])
    } finally {
      setIsSearchingCompanyCity(false)
    }
  }, [])
  
  // Effet pour déclencher la recherche d'entreprise
  useEffect(() => {
    if (debouncedCompanyQuery) {
      searchCompanyWithPhoton(debouncedCompanyQuery)
      setShowCompanyResults(true)
    } else {
      setCompanySearchResults([])
      setShowCompanyResults(false)
    }
  }, [debouncedCompanyQuery, searchCompanyWithPhoton])
  
  // Effet pour déclencher la recherche de villes pour l'entreprise
  useEffect(() => {
    if (debouncedCompanyCityQuery) {
      searchCompanyCitiesWithPhoton(debouncedCompanyCityQuery)
      setShowCompanyCityResults(true)
    } else {
      setCompanyCitySearchResults([])
      setShowCompanyCityResults(false)
    }
  }, [debouncedCompanyCityQuery, searchCompanyCitiesWithPhoton])
  
  const handleToggleEmployment = (checked: boolean) => {
    if (!setValue || typeof setValue !== 'function') {
      console.error('setValue is not available in CompanyStepV2')
      return
    }
    
    setValue('company.isEmployed', checked)
    
    if (!checked) {
      setValue('company.companyAddress.province', '')
      setValue('company.companyAddress.city', '')
      setValue('company.companyAddress.district', '')
      setValue('company.profession', '')
      setValue('company.seniority', '')
      setCompanyDistrictQuery('')
      setCompanySearchResults([])
      setSelectedCompanyLocation(null)
      setNeedsCompanyCityCorrection(false)
      setCompanyCityQuery('')
      setCompanyCitySearchResults([])
      // Réinitialiser les IDs dans le formulaire
      ;(setValue as any)('company.companyAddress.provinceId', '', { shouldValidate: true })
      ;(setValue as any)('company.companyAddress.communeId', '', { shouldValidate: true })
      ;(setValue as any)('company.companyAddress.districtId', '', { shouldValidate: true })
      ;(setValue as any)('company.companyAddress.quarterId', '', { shouldValidate: true })
    }
  }
  
  // Fonction pour sélectionner un résultat de localisation d'entreprise
  const handleCompanyLocationSelect = (result: PhotonResult) => {
    const { properties } = result
    
    setSelectedCompanyLocation(result)
    setCompanyDistrictQuery(properties.name)
    setShowCompanyResults(false)
    
    // S'assurer qu'on est en mode Photon et le sauvegarder
    if (addressTab !== 'photon') {
      setAddressTab('photon')
    }
    
    if (setValue && typeof setValue === 'function') {
      setValue('company.companyAddress.district', properties.name)
      
      let cityValue = ''
      if (properties.type === 'city') {
        cityValue = properties.name
        setDetectedCompanyCityName(properties.name)
        setNeedsCompanyCityCorrection(true)
      } else {
        cityValue = properties.city || properties.suburb || ''
        setNeedsCompanyCityCorrection(false)
      }
      setValue('company.companyAddress.city', cityValue)
      setValue('company.companyAddress.province', properties.state || '')
      
      // Sauvegarder le mode Photon dans le formulaire
      ;(setValue as any)('company.companyAddress.source', 'photon', { shouldValidate: false })
    }
  }
  
  const handleConfirmCompanyCity = () => {
    setNeedsCompanyCityCorrection(false)
  }
  
  const handleCompanyCitySelect = (result: PhotonResult) => {
    const { properties } = result
    setValue('company.companyAddress.city', properties.name)
    setCompanyCityQuery('')
    setShowCompanyCityResults(false)
    setNeedsCompanyCityCorrection(false)
  }
  
  const handleCancelCompanyCityCorrection = () => {
    setValue('company.companyAddress.city', detectedCompanyCityName)
    setCompanyCityQuery('')
    setShowCompanyCityResults(false)
    setNeedsCompanyCityCorrection(false)
  }
  
  const formatCompanyResultDisplay = (result: PhotonResult) => {
    const { properties } = result
    const parts = [
      properties.name,
      properties.city || properties.suburb,
      properties.state
    ].filter(Boolean)
    return parts.join(', ')
  }
  
  // Nettoyer automatiquement les erreurs quand les champs sont corrigés
  useEffect(() => {
    const subscription = watch((value: any) => {
      if (value.company?.companyAddress?.province && value.company.companyAddress.province.trim().length >= 2 && value.company.companyAddress.province.trim().length <= 50 && errors.company?.companyAddress?.province) {
        clearErrors('company.companyAddress.province')
      }
      if (value.company?.companyAddress?.city && value.company.companyAddress.city.trim().length >= 2 && value.company.companyAddress.city.trim().length <= 50 && errors.company?.companyAddress?.city) {
        clearErrors('company.companyAddress.city')
      }
      if (value.company?.companyAddress?.district && value.company.companyAddress.district.trim().length >= 2 && value.company.companyAddress.district.trim().length <= 100 && errors.company?.companyAddress?.district) {
        clearErrors('company.companyAddress.district')
      }
      if (value.company?.profession && value.company.profession.trim().length >= 2 && value.company.profession.trim().length <= 100 && errors.company?.profession) {
        clearErrors('company.profession')
      }
      if (value.company?.seniority && value.company.seniority.trim().match(/^\d+\s*(mois|années?|ans?)$/) && errors.company?.seniority) {
        clearErrors('company.seniority')
      }
    })
    
    return () => subscription.unsubscribe()
  }, [watch, clearErrors, errors.company])

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="text-center pb-4 border-b border-slate-100 animate-in fade-in-0 slide-in-from-top-4 duration-300">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-amber-500/10 to-orange-500/10 rounded-full text-sm font-medium text-amber-700 mb-2">
          <Briefcase className="w-4 h-4" />
          Informations professionnelles
        </div>
        <p className="text-slate-500 text-sm">
          Cette section est optionnelle
        </p>
      </div>

      {/* Toggle emploi */}
      <div
        className={cn(
          "relative p-6 rounded-2xl border-2 transition-all duration-300 animate-in fade-in-0 zoom-in-95 duration-300 delay-100",
          isEmployed 
            ? "bg-linear-to-br from-amber-50 to-orange-50 border-amber-200" 
            : "bg-slate-50 border-slate-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              isEmployed ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-400"
            )}>
              {isEmployed ? <Briefcase className="w-6 h-6" /> : <Coffee className="w-6 h-6" />}
            </div>
            <div>
              <p className="font-semibold text-slate-700">
                {isEmployed ? "Je travaille actuellement" : "Sans emploi"}
              </p>
              <p className="text-sm text-slate-500">
                {isEmployed 
                  ? "Renseignez les informations de votre entreprise" 
                  : "Activez si vous êtes employé(e)"}
              </p>
            </div>
          </div>
          
          <Switch
            checked={isEmployed}
            onCheckedChange={handleToggleEmployment}
            className="data-[state=checked]:bg-amber-500"
          />
        </div>
      </div>

      {/* Formulaire conditionnel */}
      {isEmployed ? (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          {/* Nom de l'entreprise */}
          {isAdminContext ? (
            <CompanyCombobox 
              form={form} 
              onAddNew={() => setShowAddCompanyModal(true)}
            />
          ) : (
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                Nom de l'entreprise *
              </Label>
              <Input
                {...register('company.companyName')}
                placeholder="Ex: Total Gabon, Ministère de la Santé..."
                className={cn(
                  "h-11 border-slate-200 focus:ring-amber-500/20 focus:border-amber-500",
                  errors.company?.companyName && "border-red-300"
                )}
              />
              {errors.company?.companyName && (
                <p className="text-xs text-red-500">{errors.company.companyName.message}</p>
              )}
            </div>
          )}

          {/* Adresse de l'entreprise avec tabs */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <Label className="text-slate-700 font-medium text-sm">
                Adresse de l'entreprise <span className="text-red-500">*</span>
              </Label>
            </div>
            
            <Tabs value={addressTab} onValueChange={(value) => setAddressTab(value as 'database' | 'photon')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="database" className="text-sm">
                  Base de données
                </TabsTrigger>
                <TabsTrigger value="photon" className="text-sm">
                  Recherche Photon
                </TabsTrigger>
              </TabsList>

              {/* Onglet Base de données - Design aligné avec AddressStepV2 */}
              <TabsContent value="database" className="space-y-4 mt-4">
                {/* Indicateur de progression */}
                {(() => {
                  const companyAddressProgress = [
                    !!selectedCompanyProvinceId,
                    !!selectedCompanyCommuneId,
                    !!selectedCompanyDistrictId,
                    !!selectedCompanyQuarterId
                  ].filter(Boolean).length
                  
                  return (
                    <div className="flex items-center justify-center gap-3 py-3 px-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                      <Building2 className="w-5 h-5 text-amber-600" />
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={cn(
                              "w-2.5 h-2.5 rounded-full transition-all duration-500",
                              step <= companyAddressProgress 
                                ? "bg-amber-500 shadow-lg shadow-amber-500/50 scale-110" 
                                : "bg-slate-300"
                            )}
                          />
                        ))}
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        companyAddressProgress === 4 ? "text-amber-600" : "text-slate-500"
                      )}>
                        {companyAddressProgress === 0 && "Sélectionnez une province"}
                        {companyAddressProgress === 1 && "Sélectionnez une ville"}
                        {companyAddressProgress === 2 && "Sélectionnez un arrondissement"}
                        {companyAddressProgress === 3 && "Sélectionnez un quartier"}
                        {companyAddressProgress === 4 && "✨ Adresse complète"}
                      </span>
                    </div>
                  )
                })()}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
                  {/* Province */}
                  <div className={cn(
                    "relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                    selectedCompanyProvinceId 
                      ? "border-amber-400 bg-amber-50/50" 
                      : "border-amber-200 bg-white hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10"
                  )}>
                    <div className="flex items-center gap-3 mb-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                        selectedCompanyProvinceId
                          ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30"
                          : "bg-amber-100"
                      )}>
                        <Landmark className={cn("w-5 h-5", selectedCompanyProvinceId ? "text-white" : "text-amber-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className={cn("font-semibold text-sm", selectedCompanyProvinceId ? "text-amber-700" : "text-slate-700")}>
                          Province *
                        </Label>
                        {selectedCompanyProvinceId && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="text-xs text-amber-600">Sélectionné</span>
                          </div>
                        )}
                      </div>
                      {isAdminContext && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowAddCompanyProvinceModal(true)}
                          className="h-8 w-8 shrink-0 border-amber-300 hover:bg-amber-50"
                          title="Ajouter une nouvelle province"
                        >
                          <Plus className="w-4 h-4 text-amber-600" />
                        </Button>
                      )}
                    </div>
                    
                    <Select value={selectedCompanyProvinceId} onValueChange={handleCompanyProvinceChange} disabled={isLoadingCompanyProvinces}>
                      <SelectTrigger className={cn(
                        "h-12 w-full rounded-xl border-2 transition-all bg-white",
                        selectedCompanyProvinceId ? "border-amber-300" : "border-amber-200 hover:border-amber-400 focus:border-amber-500",
                        errors.company?.companyAddress?.province && "border-red-300"
                      )}>
                        {isLoadingCompanyProvinces ? (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span className="truncate">Chargement...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Sélectionnez une province..." className="truncate" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCompanyProvinces.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.company?.companyAddress?.province && (isSubmitted || touchedFields.company?.companyAddress?.province || selectedCompanyProvinceId) && (
                      <p className="text-xs text-red-500 mt-2">{errors.company.companyAddress.province.message}</p>
                    )}
                  </div>

                  {/* Ville */}
                  <div className={cn(
                    "relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                    selectedCompanyCommuneId 
                      ? "border-orange-400 bg-orange-50/50" 
                      : !selectedCompanyProvinceId
                        ? "border-slate-200 bg-slate-50 opacity-60"
                        : "border-orange-200 bg-white hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/10"
                  )}>
                    <div className="flex items-center gap-3 mb-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                        selectedCompanyCommuneId
                          ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30"
                          : !selectedCompanyProvinceId
                            ? "bg-slate-200"
                            : "bg-orange-100"
                      )}>
                        <Building2 className={cn("w-5 h-5", selectedCompanyCommuneId ? "text-white" : !selectedCompanyProvinceId ? "text-slate-400" : "text-orange-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className={cn("font-semibold text-sm", selectedCompanyCommuneId ? "text-orange-700" : !selectedCompanyProvinceId ? "text-slate-400" : "text-slate-700")}>
                          Ville *
                        </Label>
                        {selectedCompanyCommuneId && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-orange-500 shrink-0" />
                            <span className="text-xs text-orange-600">Sélectionné</span>
                          </div>
                        )}
                      </div>
                      {isAdminContext && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowAddCompanyCommuneModal(true)}
                          className="h-8 w-8 shrink-0 border-orange-300 hover:bg-orange-50"
                          title="Ajouter une nouvelle commune"
                          disabled={!selectedCompanyProvinceId}
                        >
                          <Plus className="w-4 h-4 text-orange-600" />
                        </Button>
                      )}
                    </div>
                    
                    <Select 
                      value={selectedCompanyCommuneId} 
                      onValueChange={handleCompanyCommuneChange}
                      disabled={!selectedCompanyProvinceId || isLoadingCompanyCommunes || isLoadingCompanyDepartments}
                    >
                      <SelectTrigger className={cn(
                        "h-12 w-full rounded-xl border-2 transition-all",
                        selectedCompanyCommuneId 
                          ? "border-orange-300 bg-white" 
                          : !selectedCompanyProvinceId
                            ? "border-slate-200 bg-slate-100"
                            : "border-orange-200 hover:border-orange-400 focus:border-orange-500 bg-white",
                        errors.company?.companyAddress?.city && "border-red-300"
                      )}>
                        {isLoadingCompanyCommunes || isLoadingCompanyDepartments ? (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span className="truncate">Chargement...</span>
                          </div>
                        ) : (
                          <SelectValue 
                            placeholder={selectedCompanyProvinceId ? "Sélectionnez une ville..." : "Sélectionnez d'abord une province"} 
                            className="truncate"
                          />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {allCompanyCommunes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.company?.companyAddress?.city && (isSubmitted || touchedFields.company?.companyAddress?.city || selectedCompanyCommuneId) && (
                      <p className="text-xs text-red-500 mt-2">{errors.company.companyAddress.city.message}</p>
                    )}
                  </div>

                  {/* Arrondissement */}
                  <div className={cn(
                    "relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                    selectedCompanyDistrictId 
                      ? "border-yellow-400 bg-yellow-50/50" 
                      : !selectedCompanyCommuneId
                        ? "border-slate-200 bg-slate-50 opacity-60"
                        : "border-yellow-200 bg-white hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-500/10"
                  )}>
                    <div className="flex items-center gap-3 mb-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                        selectedCompanyDistrictId
                          ? "bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg shadow-yellow-500/30"
                          : !selectedCompanyCommuneId
                            ? "bg-slate-200"
                            : "bg-yellow-100"
                      )}>
                        <Navigation className={cn("w-5 h-5", selectedCompanyDistrictId ? "text-white" : !selectedCompanyCommuneId ? "text-slate-400" : "text-yellow-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className={cn("font-semibold text-sm", selectedCompanyDistrictId ? "text-yellow-700" : !selectedCompanyCommuneId ? "text-slate-400" : "text-slate-700")}>
                          Arrondissement *
                        </Label>
                        {selectedCompanyDistrictId && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-yellow-500 shrink-0" />
                            <span className="text-xs text-yellow-600">Sélectionné</span>
                          </div>
                        )}
                      </div>
                      {isAdminContext && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowAddCompanyDistrictModal(true)}
                          className="h-8 w-8 shrink-0 border-yellow-300 hover:bg-yellow-50"
                          title="Ajouter un nouvel arrondissement"
                          disabled={!selectedCompanyCommuneId}
                        >
                          <Plus className="w-4 h-4 text-yellow-600" />
                        </Button>
                      )}
                    </div>
                    
                    <Select 
                      value={selectedCompanyDistrictId} 
                      onValueChange={handleCompanyDistrictChange}
                      disabled={!selectedCompanyCommuneId || isLoadingCompanyDistricts}
                    >
                      <SelectTrigger className={cn(
                        "h-12 w-full rounded-xl border-2 transition-all",
                        selectedCompanyDistrictId 
                          ? "border-yellow-300 bg-white" 
                          : !selectedCompanyCommuneId
                            ? "border-slate-200 bg-slate-100"
                            : "border-yellow-200 hover:border-yellow-400 focus:border-yellow-500 bg-white",
                        errors.company?.companyAddress?.district && "border-red-300"
                      )}>
                        {isLoadingCompanyDistricts ? (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span className="truncate">Chargement...</span>
                          </div>
                        ) : (
                          <SelectValue 
                            placeholder={selectedCompanyCommuneId ? "Sélectionnez un arrondissement..." : "Sélectionnez d'abord une ville"} 
                            className="truncate"
                          />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {sortedCompanyDistricts.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.company?.companyAddress?.district && (
                      <p className="text-xs text-red-500 mt-2">{errors.company.companyAddress.district.message}</p>
                    )}
                  </div>

                  {/* Quartier */}
                  <div className={cn(
                    "relative p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden",
                    selectedCompanyQuarterId 
                      ? "border-lime-400 bg-lime-50/50" 
                      : !selectedCompanyDistrictId
                        ? "border-slate-200 bg-slate-50 opacity-60"
                        : "border-lime-200 bg-white hover:border-lime-400 hover:shadow-lg hover:shadow-lime-500/10"
                  )}>
                    <div className="flex items-center gap-3 mb-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                        selectedCompanyQuarterId
                          ? "bg-gradient-to-br from-lime-500 to-lime-600 shadow-lg shadow-lime-500/30"
                          : !selectedCompanyDistrictId
                            ? "bg-slate-200"
                            : "bg-lime-100"
                      )}>
                        <TreePine className={cn("w-5 h-5", selectedCompanyQuarterId ? "text-white" : !selectedCompanyDistrictId ? "text-slate-400" : "text-lime-600")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className={cn("font-semibold text-sm", selectedCompanyQuarterId ? "text-lime-700" : !selectedCompanyDistrictId ? "text-slate-400" : "text-slate-700")}>
                          Quartier *
                        </Label>
                        {selectedCompanyQuarterId && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-lime-500 shrink-0" />
                            <span className="text-xs text-lime-600">Sélectionné</span>
                          </div>
                        )}
                      </div>
                      {isAdminContext && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowAddCompanyQuarterModal(true)}
                          className="h-8 w-8 shrink-0 border-lime-300 hover:bg-lime-50"
                          title="Ajouter un nouveau quartier"
                          disabled={!selectedCompanyDistrictId}
                        >
                          <Plus className="w-4 h-4 text-lime-600" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="w-full min-w-0">
                      <Select 
                        value={selectedCompanyQuarterId}
                        onValueChange={handleCompanyQuarterChange}
                        disabled={!selectedCompanyDistrictId || isLoadingCompanyQuarters}
                      >
                        <SelectTrigger className={cn(
                          "h-12 w-full rounded-xl border-2 transition-all box-border",
                          selectedCompanyQuarterId 
                            ? "border-lime-300 bg-white" 
                            : !selectedCompanyDistrictId
                              ? "border-slate-200 bg-slate-100"
                              : "border-lime-200 hover:border-lime-400 focus:border-lime-500 bg-white",
                          errors.company?.companyAddress?.district && "border-red-300"
                        )}>
                          {isLoadingCompanyQuarters ? (
                            <div className="flex items-center gap-2 text-slate-400 min-w-0">
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                              <span className="truncate">Chargement...</span>
                            </div>
                          ) : (
                            <SelectValue 
                              placeholder={selectedCompanyDistrictId ? "Sélectionnez un quartier..." : "Sélectionnez d'abord un arrondissement"} 
                              className="truncate"
                            />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {sortedCompanyQuarters.map(q => (
                            <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {errors.company?.companyAddress?.district && (isSubmitted || touchedFields.company?.companyAddress?.district || selectedCompanyQuarterId) && (
                      <p className="text-xs text-red-500 mt-2">{errors.company.companyAddress.district.message}</p>
                    )}
                  </div>
                </div>
                
                {/* Récapitulatif de l'adresse (si complète) */}
                {selectedCompanyProvinceId && selectedCompanyCommuneId && selectedCompanyDistrictId && selectedCompanyQuarterId && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-300 animate-in fade-in-0 zoom-in-95 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-green-800 text-sm">Adresse de l'entreprise complète</h4>
                        <p className="text-xs text-green-600">
                          {selectedCompanyQuarter?.name}, {selectedCompanyDistrict?.name}, {selectedCompanyCommune?.name}, {selectedCompanyProvince?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Onglet Photon Komoot */}
              <TabsContent value="photon" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Colonne de gauche - Recherche de quartier */}
                  <div className="space-y-4">
                    {/* Recherche de quartier */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium text-sm">
                        Rechercher le quartier de l'entreprise <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-500 z-10" />
                        <Input
                          value={companyDistrictQuery ?? ''}
                          onChange={(e) => setCompanyDistrictQuery(e.target.value ?? '')}
                          placeholder="Ex: Glass, Akanda, Lalala..."
                          className={cn(
                            "pl-10 pr-12 border-slate-200 focus:ring-amber-500/20 focus:border-amber-500",
                            errors?.company?.companyAddress?.district && "border-red-300",
                            selectedCompanyLocation && "border-amber-500 bg-amber-50/50"
                          )}
                        />
                        
                        {isSearchingCompany && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-500 animate-spin z-10" />
                        )}
                        
                        {selectedCompanyLocation && !isSearchingCompany && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-amber-500 z-10" />
                        )}

                        {/* Résultats de recherche */}
                        {showCompanyResults && companySearchResults.length > 0 && (
                          <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-amber-200 shadow-lg w-full max-h-64 overflow-y-auto">
                            <CardContent className="p-2">
                              <div className="space-y-1">
                                {companySearchResults.map((result, index) => (
                                  <Button
                                    key={index}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-left hover:bg-amber-50 transition-colors text-sm p-3"
                                    onClick={() => handleCompanyLocationSelect(result)}
                                  >
                                    <div className="flex items-start space-x-2 w-full">
                                      <MapPinIcon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                      <div className="text-left">
                                        <div className="font-medium text-slate-700">
                                          {result.properties.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {formatCompanyResultDisplay(result)}
                                        </div>
                                      </div>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Aucun résultat */}
                        {showCompanyResults && companySearchResults.length === 0 && !isSearchingCompany && companyDistrictQuery.length > 2 && (
                          <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-amber-200 shadow-lg w-full">
                            <CardContent className="p-4 text-center">
                              <div className="text-xs text-slate-500">
                                Aucun résultat trouvé pour "{companyDistrictQuery}"
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      
                      {errors?.company?.companyAddress?.district && (
                        <div className="flex items-center space-x-1 text-red-500 text-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>{errors.company.companyAddress.district.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Informations automatiques */}
                    {selectedCompanyLocation && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-slate-700">
                            Localisation de l'entreprise détectée
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          {formatCompanyResultDisplay(selectedCompanyLocation)}
                        </div>
                      </div>
                    )}

                    {/* Section de correction de ville */}
                    {needsCompanyCityCorrection && (
                      <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-3 flex-1">
                            <div>
                              <h4 className="text-sm font-medium text-orange-800">
                                Vérification de la ville de l'entreprise
                              </h4>
                              <p className="text-xs text-orange-700 mt-1">
                                Nous avons détecté <strong>"{detectedCompanyCityName}"</strong> comme ville. 
                                Est-ce correct ou souhaitez-vous la corriger ?
                              </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleConfirmCompanyCity}
                                className="bg-amber-500 hover:bg-amber-600 text-white flex-1 sm:flex-none"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                C'est correct
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCompanyCityQuery('')
                                  document.getElementById('companyCitySearch')?.focus()
                                }}
                                className="border-orange-300 text-orange-700 hover:bg-orange-50 flex-1 sm:flex-none"
                              >
                                <Search className="w-4 h-4 mr-1" />
                                Corriger la ville
                              </Button>
                            </div>

                            {/* Champ de recherche de ville conditionnel */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-orange-800">
                                Rechercher la vraie ville
                              </Label>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 z-10" />
                                <Input
                                  id="companyCitySearch"
                                  value={companyCityQuery ?? ''}
                                  onChange={(e) => setCompanyCityQuery(e.target.value ?? '')}
                                  placeholder="Ex: Libreville, Port-Gentil..."
                                  className="pl-10 pr-12 border-orange-300 focus:border-orange-500 focus:ring-orange-200 w-full"
                                />
                                
                                {isSearchingCompanyCity && (
                                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin z-10" />
                                )}

                                {/* Résultats de recherche de villes */}
                                {showCompanyCityResults && companyCitySearchResults.length > 0 && (
                                  <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-orange-300 shadow-lg w-full max-h-48 overflow-y-auto">
                                    <CardContent className="p-2">
                                      <div className="space-y-1">
                                        {companyCitySearchResults.map((result, index) => (
                                          <Button
                                            key={index}
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-left hover:bg-orange-50 transition-colors text-xs p-3"
                                            onClick={() => handleCompanyCitySelect(result)}
                                          >
                                            <div className="flex items-start space-x-2 w-full">
                                              <Building2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                              <div className="text-left">
                                                <div className="font-medium text-orange-800">
                                                  {result.properties.name}
                                                </div>
                                                <div className="text-xs text-orange-600">
                                                  {result.properties.state ? `${result.properties.state}, Gabon` : 'Gabon'}
                                                </div>
                                              </div>
                                            </div>
                                          </Button>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Aucun résultat pour les villes */}
                                {showCompanyCityResults && companyCitySearchResults.length === 0 && !isSearchingCompanyCity && companyCityQuery.length > 2 && (
                                  <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-orange-300 shadow-lg w-full">
                                    <CardContent className="p-4 text-center">
                                      <div className="text-xs text-orange-600">
                                        Aucune ville trouvée pour "{companyCityQuery}"
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelCompanyCityCorrection}
                                  className="border-slate-300 text-slate-600 hover:bg-slate-50 text-xs"
                                >
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Colonne de droite - Champs automatiques */}
                  <div className="space-y-4">
                    {/* Ville (automatique) */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-medium text-sm">
                        Ville <span className="text-red-500">*</span>
                        <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                          Automatique
                        </Badge>
                      </Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          {...register('company.companyAddress.city')}
                          disabled
                          placeholder="Sélectionnez d'abord un quartier"
                          className="pl-10 bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Province (automatique) */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-medium text-sm">
                        Province <span className="text-red-500">*</span>
                        <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                          Automatique
                        </Badge>
                      </Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          {...register('company.companyAddress.province')}
                          disabled
                          placeholder="Sélectionnez d'abord un quartier"
                          className="pl-10 bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Quartier (automatique) */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 font-medium text-sm">
                        Quartier <span className="text-red-500">*</span>
                        <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
                          Automatique
                        </Badge>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          {...register('company.companyAddress.district')}
                          disabled
                          placeholder="Sélectionnez d'abord un quartier"
                          className="pl-10 bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Profession */}
          {isAdminContext ? (
            <ProfessionCombobox 
              form={form} 
              onAddNew={() => setShowAddProfessionModal(true)}
            />
          ) : (
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                Profession *
              </Label>
              <Input
                {...register('company.profession')}
                placeholder="Ex: Enseignant, Médecin, Ingénieur..."
                className={cn(
                  "h-11 border-slate-200 focus:ring-amber-500/20 focus:border-amber-500",
                  errors.company?.profession && "border-red-300"
                )}
              />
              {errors.company?.profession && (
                <p className="text-xs text-red-500">{errors.company.profession.message}</p>
              )}
            </div>
          )}

          {/* Ancienneté */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Ancienneté * (Format: "2 ans" ou "6 mois")
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue('company.seniority', option)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    selectedSeniority === option
                      ? "bg-amber-500 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700"
                  )}
                >
                  {selectedSeniority === option && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {option}
                </button>
              ))}
            </div>
            
            {/* Champ personnalisé */}
            <Input
              {...register('company.seniority')}
              placeholder="Ou saisissez une durée personnalisée (ex: 2 ans, 6 mois)..."
              className={cn(
                "h-10 border-slate-200 focus:ring-amber-500/20 focus:border-amber-500",
                errors.company?.seniority && "border-red-300"
              )}
            />
            
            {errors.company?.seniority && (
              <p className="text-xs text-red-500">{errors.company.seniority.message}</p>
            )}
            <p className="text-xs text-slate-500">
              Format attendu: "2 ans" ou "6 mois"
            </p>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center animate-in fade-in-0 duration-300">
          <div className="w-20 h-20 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Coffee className="w-10 h-10 text-slate-300" />
          </div>
          <p className="text-slate-400 text-sm">
            Section désactivée
          </p>
          <p className="text-slate-300 text-xs mt-1">
            Activez le bouton ci-dessus pour renseigner vos informations professionnelles
          </p>
        </div>
      )}

      {/* Modals de création rapide (uniquement en contexte admin) */}
      {isAdminContext && (
        <>
          <AddCompanyModal
            open={showAddCompanyModal}
            onClose={() => setShowAddCompanyModal(false)}
            onSuccess={handleCompanyCreated}
          />
          <AddProfessionModal
            open={showAddProfessionModal}
            onClose={() => setShowAddProfessionModal(false)}
            onSuccess={handleProfessionCreated}
          />
          <AddProvinceModal
            open={showAddCompanyProvinceModal}
            onClose={() => setShowAddCompanyProvinceModal(false)}
            onSuccess={handleCompanyProvinceCreated}
          />
          <AddCommuneModal
            open={showAddCompanyCommuneModal}
            onClose={() => setShowAddCompanyCommuneModal(false)}
            onSuccess={handleCompanyCommuneCreated}
            provinceId={selectedCompanyProvinceId || undefined}
          />
          <AddDistrictModal
            open={showAddCompanyDistrictModal}
            onClose={() => setShowAddCompanyDistrictModal(false)}
            onSuccess={handleCompanyDistrictCreated}
            communeId={selectedCompanyCommuneId || undefined}
          />
          <AddQuarterModal
            open={showAddCompanyQuarterModal}
            onClose={() => setShowAddCompanyQuarterModal(false)}
            onSuccess={handleCompanyQuarterCreated}
            districtId={selectedCompanyDistrictId || undefined}
          />
        </>
      )}
    </div>
  )
}
