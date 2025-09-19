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
  Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { findProfessionByName } from '@/db/profession.db'
import { CompanyNameForm } from '@/components/company-form'

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
  const [showProfessionSuggestions, setShowProfessionSuggestions] = useState(false)
  const [showSenioritySuggestions, setShowSenioritySuggestions] = useState(false)
  
  // États pour les suggestions dynamiques
  const [professionSuggestions, setProfessionSuggestions] = useState<Suggestion[]>([])
  const [isLoadingProfessionSuggestions, setIsLoadingProfessionSuggestions] = useState(false)

  // États pour la géolocalisation de l'entreprise
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


  // Fonction pour récupérer les suggestions de professions
  const fetchProfessionSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setProfessionSuggestions([])
      return
    }

    setIsLoadingProfessionSuggestions(true)
    try {
      const result = await findProfessionByName(query)
      const suggestions: Suggestion[] = []
      
      if (result.found && result.profession) {
        suggestions.push({ name: result.profession.name })
      }
      
      if (result.suggestions) {
        result.suggestions.forEach(suggestion => {
          suggestions.push({ name: suggestion })
        })
      }
      
      // Ajouter l'option de créer une nouvelle profession
      if (query.trim().length >= 2) {
        suggestions.push({ name: `Créer "${query}"`, isNew: true })
      }
      
      setProfessionSuggestions(suggestions)
    } catch (error) {
      console.error('Erreur lors de la récupération des suggestions de professions:', error)
      setProfessionSuggestions([])
    } finally {
      setIsLoadingProfessionSuggestions(false)
    }
  }, [])

  // Fonction pour forcer la création automatique si aucune suggestion n'est sélectionnée
  const forceCreateIfNoSelection = useCallback((field: string, value: string) => {
    if (!value || value.trim().length < 2) return
    
    // Si la valeur n'est pas dans les suggestions existantes, forcer la création
    const existingSuggestions = professionSuggestions
    const hasExistingMatch = existingSuggestions.some(s => !s.isNew && s.name === value)
    
    if (!hasExistingMatch && value.trim().length >= 2) {
      // Forcer la création automatique
      handleSuggestionClick(field, `Créer "${value}"`, true)
    }
  }, [professionSuggestions])

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


  useEffect(() => {
    const profession = watch('company.profession')
    if (profession && profession.trim().length >= 2) {
      fetchProfessionSuggestions(profession)
    } else {
      setProfessionSuggestions([])
    }
  }, [watch('company.profession'), fetchProfessionSuggestions])


  useEffect(() => {
    if (showProfessionSuggestions && professionSuggestions.length === 0) {
      const profession = watch('company.profession')
      if (profession && profession.trim().length >= 2) {
        fetchProfessionSuggestions(profession)
      }
    }
  }, [showProfessionSuggestions, professionSuggestions.length, watch('company.profession'), fetchProfessionSuggestions])


  useEffect(() => {
    const profession = watch('company.profession')
    if (profession && profession.trim().length >= 2 && professionSuggestions.length === 0) {
      fetchProfessionSuggestions(profession)
    }
  }, [watch('company.profession'), professionSuggestions.length, fetchProfessionSuggestions])

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


  useEffect(() => {
    if (professionSuggestions.length > 0 && !professionSuggestions.some(s => !s.isNew && s.name === watch('company.profession'))) {
      const profession = watch('company.profession')
      if (profession && profession.trim().length >= 2) {
        // Si la valeur n'est pas dans les suggestions existantes, forcer la création
        setTimeout(() => {
          forceCreateIfNoSelection('company.profession', profession)
        }, 100)
      }
    }
  }, [professionSuggestions, watch('company.profession'), forceCreateIfNoSelection])

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
    
    
    if (field === 'company.profession') setShowProfessionSuggestions(false)
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

  // Fonction pour valider et forcer la création si nécessaire
  const validateAndForceCreation = useCallback(() => {
    const profession = watch('company.profession')
    
    if (profession && profession.trim().length >= 2) {
      forceCreateIfNoSelection('company.profession', profession)
    }
  }, [watch, forceCreateIfNoSelection])

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
            <CompanyNameForm form={form} />
            {/* Adresse de l'entreprise */}
            <div className="space-y-4 w-full min-w-0">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-[#224D62]" />
                <Label className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Adresse de l'entreprise <span className="text-red-500">*</span>
                </Label>
              </div>
              
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
            </div>
            {/* Profession et Ancienneté */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full">
              {/* Profession */}
              <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 delay-500 w-full min-w-0">
                <Label htmlFor="profession" className="text-xs sm:text-sm font-medium text-[#224D62]">
                  Profession <span className="text-red-500">*</span>
                  <Badge variant="secondary" className="ml-2 bg-[#224D62]/10 text-[#224D62] text-[10px] sm:text-xs">
                    Suggestions automatiques
                  </Badge>
                </Label>
                <div className="relative w-full min-w-0">
                  <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                  <Input
                    id="profession"
                    {...register('company.profession')}
                    placeholder="Ex: Ingénieur, Médecin..."
                    onFocus={() => setShowProfessionSuggestions(true)}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length >= 2) {
                        fetchProfessionSuggestions(value)
                        setShowProfessionSuggestions(true)
                      } else {
                        setProfessionSuggestions([])
                        setShowProfessionSuggestions(false)
                      }
                    }}
                    onBlur={(e) => {
                      // Forcer la création si aucune suggestion n'est sélectionnée
                      forceCreateIfNoSelection('company.profession', e.target.value)
                      setTimeout(() => setShowProfessionSuggestions(false), 200)
                    }}
                    className={cn(
                      "pl-10 pr-10 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300 w-full",
                      errors?.company?.profession && "border-red-300 focus:border-red-500 bg-red-50/50",
                      watchedFields[4] && !errors?.company?.profession && "border-[#CBB171] bg-[#CBB171]/5"
                    )}
                  />
                                  {isLoadingProfessionSuggestions && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
                  )}
                  {watchedFields[4] && !errors?.company?.profession && !isLoadingProfessionSuggestions && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                  )}
                  {/* Suggestions professions */}
                  {showProfessionSuggestions && professionSuggestions.length > 0 && (
                    <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 max-h-32 sm:max-h-48 overflow-y-auto w-full">
                      <CardContent className="p-2">
                        <div className="space-y-1">
                          {professionSuggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm p-2",
                                suggestion.isNew && "text-[#CBB171] font-medium"
                              )}
                              onMouseDown={() => handleSuggestionClick('company.profession', suggestion.name, suggestion.isNew)}
                            >
                              <div className="flex items-center space-x-2 w-full">
                                {suggestion.isNew ? (
                                  <Search className="w-3 h-3 text-[#CBB171] flex-shrink-0" />
                                ) : (
                                  <GraduationCap className="w-3 h-3 text-[#224D62] flex-shrink-0" />
                                )}
                                <span className="truncate">{suggestion.name}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {errors?.company?.profession && (
                  <div className="flex items-center space-x-1 text-red-500 text-xs animate-in slide-in-from-left-2 duration-300 break-words">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.company.profession.message}</span>
                  </div>
                )}
              </div>
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
                    
                    {/* Bouton de validation manuelle */}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={validateAndForceCreation}
                      className="border-[#CBB171] text-[#CBB171] hover:bg-[#CBB171]/5 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Valider
                    </Button>
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
              Utilisez le bouton "Valider" pour forcer la création si nécessaire.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}