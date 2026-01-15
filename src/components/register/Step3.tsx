'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Briefcase, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  Coffee,
  GraduationCap,
  UserX,
  Info,
  Search,
  Loader2,
  MapPinIcon,
  Building2,
  Home,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CompanyCombobox from '@/domains/infrastructure/references/components/forms/CompanyCombobox'
import AddCompanyModal from '@/domains/infrastructure/references/components/forms/AddCompanyModal'
import ProfessionCombobox from '@/domains/infrastructure/references/components/forms/ProfessionCombobox'
import AddProfessionModal from '@/domains/infrastructure/references/components/forms/AddProfessionModal'
import { useIsAdminContext } from '@/hooks/useIsAdminContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import AddProvinceModal from '@/domains/infrastructure/geography/components/modals/AddProvinceModal'
import { ServiceFactory } from '@/factories/ServiceFactory'
import AddCommuneModal from '@/domains/infrastructure/geography/components/modals/AddCommuneModal'
import AddDistrictModal from '@/domains/infrastructure/geography/components/modals/AddDistrictModal'
import AddQuarterModal from '@/domains/infrastructure/geography/components/modals/AddQuarterModal'
import type { Province, Commune, Quarter } from '@/domains/infrastructure/geography/entities/geography.types'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useProvinces, useDepartments, useDistricts, useQuarters } from '@/domains/infrastructure/geography/hooks/useGeographie'
import { useQueries } from '@tanstack/react-query'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMemo } from 'react'

interface Step3Props {
  form: any // Type du form de react-hook-form
}

// Suggestions d'ancienneté
const SENIORITY_SUGGESTIONS = [
  '6 mois', '1 an', '2 ans', '3 ans', '5 ans', '10 ans', '15 ans', '20 ans'
]

// Interface pour les suggestions
interface Suggestion {
  name: string
  isNew?: boolean
  hasAddress?: boolean
}

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

// Fonction pour debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function Step3({ form }: Step3Props) {
  const [showSenioritySuggestions, setShowSenioritySuggestions] = useState(false)

  // État pour l'onglet actif (BD par défaut)
  const [addressTab, setAddressTab] = useState<'database' | 'photon'>('database')

  // Contexte admin
  const isAdminContext = useIsAdminContext()
  const queryClient = useQueryClient()

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

  const { register, watch, setValue, formState: { errors }, clearErrors } = form

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
    setValue('company.companyAddress.provinceId', newProvince.id, { shouldValidate: true })
    toast.success(`Province "${newProvince.name}" créée et sélectionnée`)
  }

  const handleCompanyCommuneCreated = (newCommune: Commune) => {
    queryClient.invalidateQueries({ queryKey: ['communes'] })
    setValue('company.companyAddress.communeId', newCommune.id, { shouldValidate: true })
    toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
  }

  const handleCompanyDistrictCreated = (_newDistricts: any[]) => {
    // Après création en masse, rafraîchir la liste des arrondissements
    queryClient.invalidateQueries({ queryKey: ['districts'] })
    // Ne pas sélectionner automatiquement car plusieurs arrondissements ont été créés
    // L'utilisateur pourra choisir parmi les nouveaux arrondissements créés
    toast.success('Arrondissements créés avec succès')
  }

  const handleCompanyQuarterCreated = (newQuarter: Quarter) => {
    queryClient.invalidateQueries({ queryKey: ['quarters'] })
    setValue('company.companyAddress.quarterId', newQuarter.id, { shouldValidate: true })
    toast.success(`Quartier "${newQuarter.name}" créé et sélectionné`)
  }

  // États pour l'adresse basée sur la BD
  const selectedCompanyProvinceId = watch('company.companyAddress.provinceId') || ''
  const selectedCompanyCommuneId = watch('company.companyAddress.communeId') || ''
  const selectedCompanyDistrictId = watch('company.companyAddress.districtId') || ''
  const selectedCompanyQuarterId = watch('company.companyAddress.quarterId') || ''

  // Charger les provinces pour l'adresse entreprise
  const { data: companyProvinces = [], isLoading: isLoadingCompanyProvinces } = useProvinces()

  // Trier les provinces par ordre alphabétique
  const sortedCompanyProvinces = useMemo(() => {
    return [...companyProvinces].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [companyProvinces])

  // Charger les départements de la province sélectionnée
  const { data: companyDepartments = [], isLoading: isLoadingCompanyDepartments } = useDepartments(
    selectedCompanyProvinceId || undefined
  )

  // Charger toutes les communes de tous les départements de la province sélectionnée
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
    return uniqueCommunes.sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [companyCommuneQueries])

  const isLoadingCompanyCommunes = companyCommuneQueries.some(query => query.isLoading)

  // Charger les arrondissements (districts) de la commune sélectionnée
  const { data: companyDistricts = [], isLoading: isLoadingCompanyDistricts } = useDistricts(
    selectedCompanyCommuneId || undefined
  )

  // Trier les districts par ordre alphabétique
  const sortedCompanyDistricts = useMemo(() => {
    return [...companyDistricts].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [companyDistricts])

  // Charger les quartiers (quarters) de l'arrondissement sélectionné
  const { data: companyQuarters = [], isLoading: isLoadingCompanyQuarters } = useQuarters(
    selectedCompanyDistrictId || undefined
  )

  // Trier les quarters par ordre alphabétique
  const sortedCompanyQuarters = useMemo(() => {
    return [...companyQuarters].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [companyQuarters])

  // Trouver les objets complets à partir des IDs pour remplir les champs texte
  const selectedCompanyProvince = sortedCompanyProvinces.find(p => p.id === selectedCompanyProvinceId)
  const selectedCompanyCommune = allCompanyCommunes.find(c => c.id === selectedCompanyCommuneId)
  const selectedCompanyDistrict = sortedCompanyDistricts.find(d => d.id === selectedCompanyDistrictId)
  const selectedCompanyQuarter = sortedCompanyQuarters.find(q => q.id === selectedCompanyQuarterId)

  // Mettre à jour les champs texte quand les sélections changent (BD)
  useEffect(() => {
    if (addressTab === 'database') {
      if (selectedCompanyProvince) {
        setValue('company.companyAddress.province', selectedCompanyProvince.name, { shouldValidate: true })
      } else if (!selectedCompanyProvinceId) {
        setValue('company.companyAddress.province', '', { shouldValidate: true })
      }
    }
  }, [selectedCompanyProvince, selectedCompanyProvinceId, setValue, addressTab])

  useEffect(() => {
    if (addressTab === 'database') {
      if (selectedCompanyCommune) {
        setValue('company.companyAddress.city', selectedCompanyCommune.name, { shouldValidate: true })
      } else if (!selectedCompanyCommuneId) {
        setValue('company.companyAddress.city', '', { shouldValidate: true })
        setValue('company.companyAddress.district', '', { shouldValidate: true })
      }
    }
  }, [selectedCompanyCommune, selectedCompanyCommuneId, setValue, addressTab])

  useEffect(() => {
    if (addressTab === 'database') {
      if (selectedCompanyDistrict) {
        // Ne pas écraser le district si un quartier est sélectionné
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
    if (addressTab === 'database') {
      if (selectedCompanyQuarter) {
        setValue('company.companyAddress.district', selectedCompanyQuarter.name, { shouldValidate: true })
      } else if (!selectedCompanyQuarterId) {
        // Ne pas réinitialiser si un district est sélectionné
        if (!selectedCompanyDistrictId) {
          setValue('company.companyAddress.district', '', { shouldValidate: true })
        }
      }
    }
  }, [selectedCompanyQuarter, selectedCompanyQuarterId, setValue, addressTab, selectedCompanyDistrictId])

  // Réinitialiser les sélections en cascade quand un niveau supérieur change (BD)
  const handleCompanyProvinceChange = (provinceId: string) => {
    setValue('company.companyAddress.provinceId', provinceId, { shouldValidate: true })
    setValue('company.companyAddress.communeId', '', { shouldValidate: true })
    setValue('company.companyAddress.districtId', '', { shouldValidate: true })
    setValue('company.companyAddress.quarterId', '', { shouldValidate: true })
  }

  const handleCompanyCommuneChange = (communeId: string) => {
    setValue('company.companyAddress.communeId', communeId, { shouldValidate: true })
    setValue('company.companyAddress.districtId', '', { shouldValidate: true })
    setValue('company.companyAddress.quarterId', '', { shouldValidate: true })
  }

  const handleCompanyDistrictChange = (districtId: string) => {
    setValue('company.companyAddress.districtId', districtId, { shouldValidate: true })
    setValue('company.companyAddress.quarterId', '', { shouldValidate: true })
  }

  const handleCompanyQuarterChange = (quarterId: string) => {
    setValue('company.companyAddress.quarterId', quarterId, { shouldValidate: true })
  }

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
    if (addressTab === 'photon') {
      setValue('company.companyAddress.provinceId', '', { shouldValidate: true })
      setValue('company.companyAddress.communeId', '', { shouldValidate: true })
      setValue('company.companyAddress.districtId', '', { shouldValidate: true })
      setValue('company.companyAddress.quarterId', '', { shouldValidate: true })
    }
  }, [addressTab, setValue])

  // Watch pour la logique conditionnelle et animations
  const isEmployed = watch('company.isEmployed')
  const watchedFields = watch([
    'company.companyAddress.province',
    'company.companyAddress.city',
    'company.companyAddress.district',
    'company.profession',
    'company.seniority'
  ])

  // Debounce pour la recherche d'entreprise
  const debouncedCompanyQuery = useDebounce(companyDistrictQuery, 500)
  const debouncedCompanyCityQuery = useDebounce(companyCityQuery, 500)

  // Nettoyer automatiquement les erreurs quand les champs sont corrigés
  React.useEffect(() => {
    const subscription = watch((value: any) => {
      
      // Nettoyer les erreurs d'adresse entreprise
      if (value.company?.companyAddress?.province && value.company.companyAddress.province.trim().length >= 2 && value.company.companyAddress.province.trim().length <= 50 && errors.company?.companyAddress?.province) {
        clearErrors('company.companyAddress.province')
      }
      
      if (value.company?.companyAddress?.city && value.company.companyAddress.city.trim().length >= 2 && value.company.companyAddress.city.trim().length <= 50 && errors.company?.companyAddress?.city) {
        clearErrors('company.companyAddress.city')
      }
      
      if (value.company?.companyAddress?.district && value.company.companyAddress.district.trim().length >= 2 && value.company.companyAddress.district.trim().length <= 100 && errors.company?.companyAddress?.district) {
        clearErrors('company.companyAddress.district')
      }
      
      // Nettoyer les erreurs de profession
      if (value.company?.profession && value.company.profession.trim().length >= 2 && value.company.profession.trim().length <= 100 && errors.company?.profession) {
        clearErrors('company.profession')
      }
      
      // Nettoyer les erreurs d'ancienneté
      if (value.company?.seniority && value.company.seniority.trim().match(/^\d+\s*(mois|années?|ans?)$/) && errors.company?.seniority) {
        clearErrors('company.seniority')
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, clearErrors, errors.company])




  // Fonction pour rechercher avec Photon API pour l'entreprise
  const searchCompanyWithPhoton = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCompanySearchResults([])
      return
    }

    setIsSearchingCompany(true)
    try {
      // Bounding box du Gabon: [ouest, sud, est, nord]
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Filtrer pour ne garder que les résultats du Gabon
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
      // Bounding box du Gabon: [ouest, sud, est, nord]
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Filtrer pour ne garder que les vraies villes du Gabon
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
    setValue('company.isEmployed', checked)
    
    // Reset des champs si désactivé
    if (!checked) {
      setValue('company.companyAddress.province', '')
      setValue('company.companyAddress.city', '')
      setValue('company.companyAddress.district', '')
      setValue('company.profession', '')
      setValue('company.seniority', '')
      // Reset des états de géolocalisation
      setCompanyDistrictQuery('')
      setCompanySearchResults([])
      setSelectedCompanyLocation(null)
      setNeedsCompanyCityCorrection(false)
      setCompanyCityQuery('')
      setCompanyCitySearchResults([])
    }
  }

  const handleSuggestionClick = async (field: string, value: string, isNew: boolean = false) => {
    // Si c'est une nouvelle entrée, extraire le nom sans "Créer"
    const finalValue = isNew ? value.replace(/^Créer "/, '').replace(/"$/, '') : value
    setValue(field, finalValue)
    
    if (field === 'company.seniority') setShowSenioritySuggestions(false)
  }

  // Fonction pour sélectionner un résultat de localisation d'entreprise
  const handleCompanyLocationSelect = (result: PhotonResult) => {
    const { properties } = result
    
    setSelectedCompanyLocation(result)
    setCompanyDistrictQuery(properties.name)
    setShowCompanyResults(false)

    // Remplir automatiquement les champs disponibles
    setValue('company.companyAddress.district', properties.name)
    
    // Gérer les cas spéciaux pour la ville
    let cityValue = ''
    if (properties.type === 'city') {
      // Si le type est "city", utiliser le nom comme ville
      cityValue = properties.name
      setDetectedCompanyCityName(properties.name)
      setNeedsCompanyCityCorrection(true)
    } else {
      // Sinon, utiliser la logique habituelle
      cityValue = properties.city || properties.suburb || ''
      setNeedsCompanyCityCorrection(false)
    }
    setValue('company.companyAddress.city', cityValue)
    
    setValue('company.companyAddress.province', properties.state || '')
  }

  // Fonction pour confirmer la ville détectée pour l'entreprise
  const handleConfirmCompanyCity = () => {
    setNeedsCompanyCityCorrection(false)
  }

  // Fonction pour sélectionner une nouvelle ville pour l'entreprise
  const handleCompanyCitySelect = (result: PhotonResult) => {
    const { properties } = result
    
    // Remplacer uniquement la ville
    setValue('company.companyAddress.city', properties.name)
    setCompanyCityQuery('')
    setShowCompanyCityResults(false)
    setNeedsCompanyCityCorrection(false)
  }

  // Fonction pour annuler la correction de ville pour l'entreprise
  const handleCancelCompanyCityCorrection = () => {
    setValue('company.companyAddress.city', detectedCompanyCityName)
    setCompanyCityQuery('')
    setShowCompanyCityResults(false)
    setNeedsCompanyCityCorrection(false)
  }

  // Fonction pour formater l'affichage des résultats d'entreprise
  const formatCompanyResultDisplay = (result: PhotonResult) => {
    const { properties } = result
    const parts = [
      properties.name,
      properties.city || properties.suburb,
      properties.state
    ].filter(Boolean)
    
    return parts.join(', ')
  }


  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Header avec animation */}
      <div className="text-center space-y-3 animate-in fade-in-0 slide-in-from-top-4 duration-500 px-2">
        <div className="inline-flex items-center space-x-3 px-5 sm:px-6 py-3 bg-gradient-to-r from-[#224D62]/10 via-[#CBB171]/10 to-[#224D62]/10 rounded-full shadow-lg border border-[#224D62]/20">
          <Briefcase className="w-6 h-6 text-[#224D62]" />
          <span className="text-[#224D62] font-bold text-base sm:text-lg">Informations professionnelles</span>
        </div>
        <p className="text-[#224D62]/80 text-sm sm:text-base break-words font-medium">
          Renseignez vos informations d'emploi (section optionnelle)
        </p>
      </div>

      {/* Toggle principal avec card attractive */}
      <Card className="border-2 border-[#224D62]/20 bg-gradient-to-br from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 animate-in fade-in-0 zoom-in-95 duration-700 delay-200 w-full shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
            <div className="flex items-center space-x-3 w-full min-w-0">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-500",
                isEmployed 
                  ? "bg-[#224D62] text-white" 
                  : "bg-gray-100 text-gray-400"
              )}>
                {isEmployed ? <Users className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg text-[#224D62] truncate">
                  {isEmployed ? "Je travaille actuellement" : "Je ne travaille pas actuellement"}
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                  {isEmployed 
                    ? "Complétez les informations de votre entreprise" 
                    : "Activez pour renseigner vos informations professionnelles"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <Label htmlFor="employment-toggle" className="text-xs sm:text-sm font-medium text-[#224D62]">
                {isEmployed ? "Employé" : "Sans emploi"}
              </Label>
              <Switch
                id="employment-toggle"
                checked={isEmployed}
                onCheckedChange={handleToggleEmployment}
                className="data-[state=checked]:bg-[#224D62]"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section conditionnelle des informations d'entreprise */}
      <div className={cn(
        "transition-all duration-500 transform w-full",
        isEmployed 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-30 -translate-y-4 scale-95 pointer-events-none"
      )}>
        {!isEmployed && (
          <div className="text-center py-8 sm:py-12 space-y-4 w-full">
            <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Coffee className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-medium text-gray-500">Section désactivée</h3>
              <p className="text-xs sm:text-sm text-gray-400 break-words">
                Activez le bouton ci-dessus pour renseigner vos informations professionnelles
              </p>
            </div>
          </div>
        )}
        {isEmployed && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
            {/* Nom de l'entreprise */}
            {isAdminContext ? (
              <CompanyCombobox 
                form={form} 
                onAddNew={() => setShowAddCompanyModal(true)}
              />
            ) : (
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full">
                <Label htmlFor="companyName" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Nom de l'entreprise <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                  <Input
                    id="companyName"
                    {...register('company.companyName')}
                    placeholder="Ex: Total Gabon, Ministère de la Santé..."
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.companyName && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watch('company.companyName') && !errors?.company?.companyName && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                  {watch('company.companyName') && !errors?.company?.companyName && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                  )}
                </div>
                {errors?.company?.companyName && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.company.companyName.message}</span>
                  </div>
                )}
              </div>
            )}
            {/* Adresse de l'entreprise avec tabs */}
            <div className="space-y-4 w-full min-w-0">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#224D62]" />
                <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Adresse de l'entreprise <span className="text-red-500">*</span>
                </Label>
              </div>
              
              <Tabs value={addressTab} onValueChange={(value) => setAddressTab(value as 'database' | 'photon')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="database" className="text-xs sm:text-sm">
                    Base de données
                  </TabsTrigger>
                  <TabsTrigger value="photon" className="text-xs sm:text-sm">
                    Recherche Photon
                  </TabsTrigger>
                </TabsList>

                {/* Onglet Base de données */}
                <TabsContent value="database" className="space-y-4 mt-4">
                  <div className="space-y-4 sm:space-y-6 w-full">
                    {/* Ligne 1 : Province et Ville */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                      {/* Province */}
                      <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-200 w-full">
                        <Label htmlFor="companyProvince" className="text-xs sm:text-sm font-medium text-[#224D62]">
                          Province <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedCompanyProvinceId}
                            onValueChange={handleCompanyProvinceChange}
                            disabled={isLoadingCompanyProvinces}
                          >
                            <SelectTrigger
                              id="companyProvince"
                              className={cn(
                                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                                errors.company?.companyAddress?.province && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              )}
                            >
                              <SelectValue placeholder="Sélectionnez une province..." />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingCompanyProvinces ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                                </div>
                              ) : (
                                sortedCompanyProvinces.map((province) => (
                                  <SelectItem key={province.id} value={province.id}>
                                    {province.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {isAdminContext && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowAddCompanyProvinceModal(true)}
                              className="h-10 w-10 flex-shrink-0"
                              title="Ajouter une nouvelle province"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {errors.company?.companyAddress?.province && (
                          <p className="text-xs text-red-500">{errors.company.companyAddress.province.message as string}</p>
                        )}
                      </div>

                      {/* Ville (Commune) */}
                      <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-300 w-full">
                        <Label htmlFor="companyCity" className="text-xs sm:text-sm font-medium text-[#224D62]">
                          Ville <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedCompanyCommuneId}
                            onValueChange={handleCompanyCommuneChange}
                            disabled={!selectedCompanyProvinceId || isLoadingCompanyCommunes || isLoadingCompanyDepartments}
                          >
                            <SelectTrigger
                              id="companyCity"
                              className={cn(
                                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                                errors.company?.companyAddress?.city && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              )}
                            >
                              <SelectValue placeholder={
                                !selectedCompanyProvinceId 
                                  ? "Sélectionnez d'abord une province..." 
                                  : isLoadingCompanyCommunes || isLoadingCompanyDepartments
                                  ? "Chargement..."
                                  : "Sélectionnez une ville..."
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingCompanyCommunes || isLoadingCompanyDepartments ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                                </div>
                              ) : (
                                allCompanyCommunes.map((commune) => (
                                  <SelectItem key={commune.id} value={commune.id}>
                                    {commune.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {isAdminContext && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowAddCompanyCommuneModal(true)}
                              className="h-10 w-10 flex-shrink-0"
                              title="Ajouter une nouvelle commune"
                              disabled={!selectedCompanyProvinceId}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {errors.company?.companyAddress?.city && (
                          <p className="text-xs text-red-500">{errors.company.companyAddress.city.message as string}</p>
                        )}
                      </div>
                    </div>

                    {/* Ligne 2 : Arrondissement et Quartier */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                      {/* Arrondissement (District) */}
                      <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-400 w-full">
                        <Label htmlFor="companyArrondissement" className="text-xs sm:text-sm font-medium text-[#224D62]">
                          Arrondissement <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedCompanyDistrictId}
                            onValueChange={handleCompanyDistrictChange}
                            disabled={!selectedCompanyCommuneId || isLoadingCompanyDistricts}
                          >
                            <SelectTrigger
                              id="companyArrondissement"
                              className={cn(
                                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                                errors.company?.companyAddress?.district && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              )}
                            >
                              <SelectValue placeholder={
                                !selectedCompanyCommuneId 
                                  ? "Sélectionnez d'abord une ville..." 
                                  : isLoadingCompanyDistricts
                                  ? "Chargement..."
                                  : "Sélectionnez un arrondissement..."
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingCompanyDistricts ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                                </div>
                              ) : (
                                sortedCompanyDistricts.map((district) => (
                                  <SelectItem key={district.id} value={district.id}>
                                    {district.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {isAdminContext && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowAddCompanyDistrictModal(true)}
                              className="h-10 w-10 flex-shrink-0"
                              title="Ajouter un nouvel arrondissement"
                              disabled={!selectedCompanyCommuneId}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {errors.company?.companyAddress?.district && (
                          <p className="text-xs text-red-500">{errors.company.companyAddress.district.message as string}</p>
                        )}
                      </div>

                      {/* Quartier (Quarter) */}
                      <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full">
                        <Label htmlFor="companyQuarter" className="text-xs sm:text-sm font-medium text-[#224D62]">
                          Quartier <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedCompanyQuarterId}
                            onValueChange={handleCompanyQuarterChange}
                            disabled={!selectedCompanyDistrictId || isLoadingCompanyQuarters}
                          >
                            <SelectTrigger
                              id="companyQuarter"
                              className={cn(
                                "w-full border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20",
                                errors.company?.companyAddress?.district && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                              )}
                            >
                              <SelectValue placeholder={
                                !selectedCompanyDistrictId 
                                  ? "Sélectionnez d'abord un arrondissement..." 
                                  : isLoadingCompanyQuarters
                                  ? "Chargement..."
                                  : "Sélectionnez un quartier..."
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingCompanyQuarters ? (
                                <div className="flex items-center justify-center p-4">
                                  <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                                </div>
                              ) : (
                                sortedCompanyQuarters.map((quarter) => (
                                  <SelectItem key={quarter.id} value={quarter.id}>
                                    {quarter.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {isAdminContext && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowAddCompanyQuarterModal(true)}
                              className="h-10 w-10 flex-shrink-0"
                              title="Ajouter un nouveau quartier"
                              disabled={!selectedCompanyDistrictId}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {errors.company?.companyAddress?.district && (
                          <p className="text-xs text-red-500">{errors.company.companyAddress.district.message as string}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Onglet Photon Komoot */}
                <TabsContent value="photon" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 w-full">
                {/* Colonne de gauche - Recherche de quartier */}
                <div className="space-y-4 sm:space-y-6 w-full min-w-0">
                  {/* Recherche de quartier */}
                  <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
                    <Label htmlFor="companyDistrictSearch" className="text-xs sm:text-sm font-medium text-[#224D62]">
                      Rechercher le quartier de l'entreprise <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative w-full min-w-0">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                      <Input
                        id="companyDistrictSearch"
                        value={companyDistrictQuery}
                        onChange={(e) => setCompanyDistrictQuery(e.target.value)}
                        placeholder="Ex: Glass, Akanda, Lalala..."
                        className={cn(
                          "pl-10 pr-12 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                          errors?.company?.companyAddress?.district && "border-red-300 focus:border-red-500 bg-red-50/50",
                          selectedCompanyLocation && "border-[#CBB171] bg-[#CBB171]/5"
                        )}
                      />
                      
                      {/* Loading spinner */}
                      {isSearchingCompany && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
                      )}
                      
                      {/* Success checkmark */}
                      {selectedCompanyLocation && !isSearchingCompany && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                      )}

                      {/* Résultats de recherche */}
                      {showCompanyResults && companySearchResults.length > 0 && (
                        <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full max-h-64 overflow-y-auto">
                          <CardContent className="p-2">
                            <div className="space-y-1">
                              {companySearchResults.map((result, index) => (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm p-3"
                                  onClick={() => handleCompanyLocationSelect(result)}
                                >
                                  <div className="flex items-start space-x-2 w-full">
                                    <MapPinIcon className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
                                    <div className="text-left">
                                      <div className="font-medium text-[#224D62]">
                                        {result.properties.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
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
                        <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                          <CardContent className="p-4 text-center">
                            <div className="text-xs text-gray-500">
                              Aucun résultat trouvé pour "{companyDistrictQuery}"
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {errors?.company?.companyAddress?.district && (
                      <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.company.companyAddress.district.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Informations automatiques */}
                  {selectedCompanyLocation && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200 w-full min-w-0">
                      <div className="p-4 bg-[#CBB171]/5 rounded-lg border border-[#CBB171]/20">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-[#CBB171]" />
                          <span className="text-sm font-medium text-[#224D62]">
                            Localisation de l'entreprise détectée
                          </span>
                        </div>
                        <div className="text-xs text-[#224D62]/80">
                          {formatCompanyResultDisplay(selectedCompanyLocation)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section de correction de ville */}
                  {needsCompanyCityCorrection && (
                    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 w-full min-w-0">
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
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
                                className="bg-[#CBB171] hover:bg-[#CBB171]/90 text-white flex-1 sm:flex-none"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                C'est correct
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Activer la recherche de ville
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
                              <Label htmlFor="companyCitySearch" className="text-xs font-medium text-orange-800">
                                Rechercher la vraie ville
                              </Label>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 z-10" />
                                <Input
                                  id="companyCitySearch"
                                  value={companyCityQuery}
                                  onChange={(e) => setCompanyCityQuery(e.target.value)}
                                  placeholder="Ex: Libreville, Port-Gentil..."
                                  className="pl-10 pr-12 border-orange-300 focus:border-orange-500 focus:ring-orange-200 w-full"
                                />
                                
                                {isSearchingCompanyCity && (
                                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin z-10" />
                                )}

                                {/* Résultats de recherche de villes */}
                                {showCompanyCityResults && companyCitySearchResults.length > 0 && (
                                  <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-orange-300 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full max-h-48 overflow-y-auto">
                                    <CardContent className="p-2">
                                      <div className="space-y-1">
                                        {companyCitySearchResults.map((result, index) => (
                                          <Button
                                            key={index}
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
                                  <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-orange-300 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
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
                                  className="border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                                >
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Colonne de droite - Champs automatiques */}
                <div className="space-y-4 sm:space-y-6 w-full min-w-0">
                  {/* Ville (automatique) */}
                  <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-100 w-full min-w-0">
                    <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                      Ville <span className="text-red-500">*</span>
                      <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                        Automatique
                      </Badge>
                    </Label>
                    <div className="relative w-full min-w-0">
                      <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        {...register('company.companyAddress.city')}
                        disabled
                        placeholder="Sélectionnez d'abord un quartier"
                        className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
                      />
                    </div>
                  </div>

                  {/* Province (automatique) */}
                  <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-200 w-full min-w-0">
                    <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                      Province <span className="text-red-500">*</span>
                      <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                        Automatique
                      </Badge>
                    </Label>
                    <div className="relative w-full min-w-0">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        {...register('company.companyAddress.province')}
                        disabled
                        placeholder="Sélectionnez d'abord un quartier"
                        className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
                      />
                    </div>
                  </div>

                  {/* Quartier (automatique) */}
                  <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-250 w-full min-w-0">
                    <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                      Quartier <span className="text-red-500">*</span>
                      <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                        Automatique
                      </Badge>
                    </Label>
                    <div className="relative w-full min-w-0">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        {...register('company.companyAddress.district')}
                        disabled
                        placeholder="Sélectionnez d'abord un quartier"
                        className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed w-full"
                      />
                    </div>
                  </div>
                </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            {/* Profession et Ancienneté */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
              {/* Profession */}
              {isAdminContext ? (
                <ProfessionCombobox 
                  form={form} 
                  onAddNew={() => setShowAddProfessionModal(true)}
                />
              ) : (
                <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full min-w-0">
                  <Label htmlFor="profession" className="text-xs sm:text-sm font-medium text-[#224D62]">
                    Profession <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative w-full min-w-0">
                    <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                    <Input
                      id="profession"
                      {...register('company.profession')}
                      placeholder="Ex: Enseignant, Médecin, Ingénieur..."
                      className={cn(
                        "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                        errors?.company?.profession && "border-red-300 focus:border-red-500 bg-red-50/50",
                        watch('company.profession') && !errors?.company?.profession && "border-[#CBB171] bg-[#CBB171]/5"
                      )}
                    />
                    {watch('company.profession') && !errors?.company?.profession && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                    )}
                  </div>
                  {errors?.company?.profession && (
                    <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.company.profession.message}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Ancienneté */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-right-4 duration-700 delay-600 w-full min-w-0">
                <Label htmlFor="seniority" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Ancienneté <span className="text-red-500">*</span>
                </Label>
                <div className="relative w-full min-w-0">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                  <Input
                    id="seniority"
                    {...register('company.seniority')}
                    placeholder="Ex: 2 ans, 6 mois..."
                    onFocus={() => setShowSenioritySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSenioritySuggestions(false), 200)}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.seniority && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[5] && !errors?.company?.seniority && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                                  {watchedFields[5] && !errors?.company?.seniority && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                )}
                  {/* Suggestions ancienneté */}
                  {showSenioritySuggestions && (
                    <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {SENIORITY_SUGGESTIONS.map((seniority) => (
                            <Button
                              key={seniority}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm"
                              onMouseDown={() => handleSuggestionClick('company.seniority', seniority)}
                            >
                              {seniority}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {errors?.company?.seniority && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-right-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.company.seniority.message}</span>
                  </div>
                )}
                <div className="text-[10px] sm:text-xs text-gray-500">
                  Format attendu: "2 ans" ou "6 mois"
                </div>
              </div>
            </div>
            {/* Résumé professionnel */}
            {(watchedFields[0] || watchedFields[4]) && (
              <Card className="border border-[#224D62]/20 bg-gradient-to-r from-[#224D62]/5 to-[#CBB171]/5 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 w-full">
                <CardContent className="p-3 sm:p-4 w-full">
                  <div className="flex items-start justify-between w-full min-w-0">
                    <div className="flex items-start space-x-3 min-w-0">
                      <TrendingUp className="w-5 h-5 text-[#224D62] mt-1 flex-shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-[#224D62] truncate">Profil professionnel détecté</p>
                        <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                          {watchedFields[4] && watchedFields[0] 
                            ? `${watchedFields[4]} chez ${watchedFields[0]}`
                            : watchedFields[4] 
                              ? `Profession: ${watchedFields[4]}`
                              : `Entreprise: ${watchedFields[0]}`
                          }
                          {watchedFields[5] && ` • ${watchedFields[5]} d'expérience`}
                        </p>
                      </div>
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      {/* Message d'information */}
      <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-[#224D62]/5 via-[#CBB171]/5 to-[#224D62]/10 rounded-xl border border-[#224D62]/20 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-800 w-full max-w-full break-words shadow-lg">
        <div className="flex items-center justify-center space-x-3">
          <Info className="w-6 h-6 text-[#CBB171]" />
          <div className="text-center space-y-2">
            <p className="text-sm sm:text-base text-[#224D62] font-bold">
              <strong>Information :</strong> Ces données professionnelles nous aident à mieux vous connaître et adapter nos services
            </p>
            <p className="text-xs sm:text-sm text-[#224D62]/70">
              💡 <strong>Astuce :</strong> Si vous tapez une entreprise ou profession qui n'existe pas, elle sera automatiquement créée.
            </p>
          </div>
        </div>
      </div>

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