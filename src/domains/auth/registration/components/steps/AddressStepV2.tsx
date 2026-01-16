'use client'

import { useMemo, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { 
  MapPin, 
  Building2, 
  Loader2, 
  Home, 
  Sparkles,
  Navigation,
  Map,
  Landmark,
  TreePine,
  CheckCircle2
} from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { RegisterFormData } from '@/schemas/schemas'
import { useProvinces, useDepartments, useDistricts, useQuarters } from '@/domains/infrastructure/geography/hooks/useGeographie'
import { useQueries } from '@tanstack/react-query'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { Commune } from '@/domains/infrastructure/geography/entities/geography.types'

export default function AddressStepV2() {
  const { register, watch, setValue, formState: { errors, isSubmitted, touchedFields } } = useFormContext<RegisterFormData>()


  // Surveiller les IDs sélectionnés depuis le formulaire (comme l'ancien composant)
  // Ceci permet de conserver les valeurs lors de la navigation entre les étapes
  // Note: Utilisation de 'as any' car les nouveaux champs sont ajoutés au schéma mais le type n'est pas encore régénéré
  const selectedProvinceId = (watch as any)('address.provinceId') || ''
  const selectedCommuneId = (watch as any)('address.communeId') || ''
  const selectedDistrictId = (watch as any)('address.districtId') || ''
  const selectedQuarterId = (watch as any)('address.quarterId') || ''

  // Chargement des données géographiques
  const { data: provinces = [], isLoading: loadingProvinces } = useProvinces()
  const { data: departments = [], isLoading: loadingDepts } = useDepartments(selectedProvinceId || undefined)
  const { data: districts = [], isLoading: loadingDistricts } = useDistricts(selectedCommuneId || undefined)
  const { data: quarters = [], isLoading: loadingQuarters } = useQuarters(selectedDistrictId || undefined)

  // Charger les communes de tous les départements
  const communeQueries = useQueries({
    queries: departments.length > 0 
      ? departments.map(dept => ({
          queryKey: ['communes', dept.id],
          queryFn: async () => {
            const service = ServiceFactory.getGeographieService()
            return service.getCommunesByDepartmentId(dept.id)
          },
          enabled: !!selectedProvinceId && departments.length > 0,
          staleTime: 5 * 60 * 1000,
        }))
      : []
  })

  const communes = useMemo(() => {
    const all: Commune[] = []
    communeQueries.forEach(q => {
      if (q.data) all.push(...q.data)
    })
    const unique = all.filter((c, i, arr) => i === arr.findIndex(x => x.id === c.id))
    return unique.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [communeQueries])

  const loadingCommunes = communeQueries.some(q => q.isLoading)

  // Filtrer les entrées de test et trier les données
  const sortedProvinces = useMemo(() =>
    [...provinces]
      .filter(p => !p.name.toLowerCase().includes('test e2e') && !p.name.toLowerCase().includes('test'))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')), [provinces])
  const sortedDistricts = useMemo(() =>
    [...districts]
      .filter(d => !d.name.toLowerCase().includes('test e2e') && !d.name.toLowerCase().includes('test'))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')), [districts])
  const sortedQuarters = useMemo(() =>
    [...quarters]
      .filter(q => !q.name.toLowerCase().includes('test e2e') && !q.name.toLowerCase().includes('test'))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')), [quarters])
  
  // Filtrer aussi les communes
  const filteredCommunes = useMemo(() =>
    communes.filter(c => !c.name.toLowerCase().includes('test e2e') && !c.name.toLowerCase().includes('test')),
    [communes]
  )

  // Trouver les objets complets à partir des IDs pour remplir les champs texte
  const selectedProvince = sortedProvinces.find(p => p.id === selectedProvinceId)
  const selectedCommune = filteredCommunes.find(c => c.id === selectedCommuneId)
  const selectedDistrict = sortedDistricts.find(d => d.id === selectedDistrictId)
  const selectedQuarter = sortedQuarters.find(q => q.id === selectedQuarterId)

  // Mettre à jour les champs texte quand les sélections changent
  useEffect(() => {
    if (selectedProvince) {
      setValue('address.province', selectedProvince.name, { shouldValidate: true })
    } else if (!selectedProvinceId) {
      setValue('address.province', '', { shouldValidate: true })
    }
  }, [selectedProvince, selectedProvinceId, setValue])

  useEffect(() => {
    if (selectedCommune) {
      setValue('address.city', selectedCommune.name, { shouldValidate: true })
    } else if (!selectedCommuneId) {
      setValue('address.city', '', { shouldValidate: true })
      setValue('address.arrondissement', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedCommune, selectedCommuneId, setValue])

  useEffect(() => {
    if (selectedDistrict) {
      setValue('address.arrondissement', selectedDistrict.name, { shouldValidate: true })
    } else if (!selectedDistrictId) {
      setValue('address.arrondissement', '', { shouldValidate: true })
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedDistrict, selectedDistrictId, setValue])

  useEffect(() => {
    if (selectedQuarter) {
      setValue('address.district', selectedQuarter.name, { shouldValidate: true })
    } else if (!selectedQuarterId) {
      setValue('address.district', '', { shouldValidate: true })
    }
  }, [selectedQuarter, selectedQuarterId, setValue])

  // Handlers de changement cascade - stockent les IDs dans le formulaire
  // Note: Utilisation de 'as any' car les nouveaux champs sont ajoutés au schéma mais le type n'est pas encore régénéré
  const handleProvinceChange = (provinceId: string) => {
    (setValue as any)('address.provinceId', provinceId, { shouldValidate: true })
    // Réinitialiser les niveaux inférieurs
    (setValue as any)('address.communeId', '', { shouldValidate: true })
    (setValue as any)('address.districtId', '', { shouldValidate: true })
    (setValue as any)('address.quarterId', '', { shouldValidate: true })
  }

  const handleCommuneChange = (communeId: string) => {
    (setValue as any)('address.communeId', communeId, { shouldValidate: true })
    // Réinitialiser les niveaux inférieurs
    (setValue as any)('address.districtId', '', { shouldValidate: true })
    (setValue as any)('address.quarterId', '', { shouldValidate: true })
  }

  const handleDistrictChange = (districtId: string) => {
    (setValue as any)('address.districtId', districtId, { shouldValidate: true })
    // Réinitialiser le quartier
    (setValue as any)('address.quarterId', '', { shouldValidate: true })
  }

  const handleQuarterChange = (quarterId: string) => {
    (setValue as any)('address.quarterId', quarterId, { shouldValidate: true })
  }

  // Calculer la progression
  const progress = [
    !!selectedProvinceId,
    !!selectedCommuneId,
    !!selectedDistrictId,
    !!selectedQuarterId
  ].filter(Boolean).length

  return (
    <div className="space-y-8">
      {/* En-tête avec animation */}
      <div className="text-center pb-6 animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full shadow-lg shadow-emerald-500/20 mb-3">
          <MapPin className="w-5 h-5 text-white animate-bounce" />
          <span className="text-white font-bold">Votre adresse de résidence</span>
        </div>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Sélectionnez votre localisation au Gabon
        </p>
      </div>

      {/* Carte du Gabon stylisée */}
      <div className="relative p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl border-2 border-emerald-200 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-500 delay-100">
        {/* Cercles décoratifs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-200/30 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-200/30 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-center gap-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2">
              <Map className="w-8 h-8 text-white" />
            </div>
            <span className="text-xs text-slate-500">Gabon</span>
          </div>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-500",
                  step <= progress 
                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 scale-110" 
                    : "bg-slate-300"
                )}
              />
            ))}
          </div>
          
          <div className="text-center">
            <div className={cn(
              "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-2 transition-all duration-500",
              progress === 4 
                ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30" 
                : "bg-slate-200"
            )}>
              <Home className={cn("w-8 h-8", progress === 4 ? "text-white" : "text-slate-400")} />
            </div>
            <span className="text-xs text-slate-500">Votre domicile</span>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <span className={cn(
            "text-sm font-semibold",
            progress === 4 ? "text-emerald-600" : "text-slate-500"
          )}>
            {progress === 0 && "Commencez par sélectionner une province"}
            {progress === 1 && "Sélectionnez maintenant votre ville"}
            {progress === 2 && "Choisissez votre arrondissement"}
            {progress === 3 && "Dernière étape : votre quartier"}
            {progress === 4 && "✨ Adresse complète !"}
          </span>
        </div>
      </div>

      {/* Sélecteurs en cascade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-150">
        {/* Province */}
        <div className={cn(
          "relative p-5 rounded-2xl border-2 transition-all duration-300",
          selectedProvinceId 
            ? "border-emerald-400 bg-emerald-50/50" 
            : "border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              selectedProvinceId
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30"
                : "bg-emerald-100"
            )}>
              <Landmark className={cn("w-5 h-5", selectedProvinceId ? "text-white" : "text-emerald-600")} />
            </div>
            <div className="flex-1">
              <Label className={cn("font-semibold text-sm", selectedProvinceId ? "text-emerald-700" : "text-slate-700")}>
                Province *
              </Label>
              {selectedProvinceId && (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600">Sélectionné</span>
                </div>
              )}
            </div>
          </div>
          
          <Select 
            value={selectedProvinceId} 
            onValueChange={handleProvinceChange} 
            disabled={loadingProvinces}
          >
            <SelectTrigger className={cn(
              "h-12 rounded-xl border-2 transition-all bg-white",
              selectedProvinceId ? "border-emerald-300" : "border-emerald-200 hover:border-emerald-400 focus:border-emerald-500",
              errors.address?.province && "border-red-300"
            )}>
              {loadingProvinces ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <SelectValue placeholder="Sélectionnez une province..." />
              )}
            </SelectTrigger>
            <SelectContent>
              {sortedProvinces.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.address?.province && (isSubmitted || touchedFields.address?.province || selectedProvinceId) && (
            <p className="text-xs text-red-500 mt-2">{errors.address.province.message}</p>
          )}
        </div>

        {/* Ville */}
        <div className={cn(
          "relative p-5 rounded-2xl border-2 transition-all duration-300",
          selectedCommuneId 
            ? "border-teal-400 bg-teal-50/50" 
            : !selectedProvinceId
              ? "border-slate-200 bg-slate-50 opacity-60"
              : "border-teal-200 bg-white hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/10"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              selectedCommuneId
                ? "bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30"
                : !selectedProvinceId
                  ? "bg-slate-200"
                  : "bg-teal-100"
            )}>
              <Building2 className={cn("w-5 h-5", selectedCommuneId ? "text-white" : !selectedProvinceId ? "text-slate-400" : "text-teal-600")} />
            </div>
            <div className="flex-1">
              <Label className={cn("font-semibold text-sm", selectedCommuneId ? "text-teal-700" : !selectedProvinceId ? "text-slate-400" : "text-slate-700")}>
                Ville *
              </Label>
              {selectedCommuneId && (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-teal-500" />
                  <span className="text-xs text-teal-600">Sélectionné</span>
                </div>
              )}
            </div>
          </div>
          
          <Select 
            value={selectedCommuneId} 
            onValueChange={handleCommuneChange}
            disabled={!selectedProvinceId || loadingCommunes || loadingDepts}
          >
            <SelectTrigger className={cn(
              "h-12 rounded-xl border-2 transition-all",
              selectedCommuneId 
                ? "border-teal-300 bg-white" 
                : !selectedProvinceId
                  ? "border-slate-200 bg-slate-100"
                  : "border-teal-200 hover:border-teal-400 focus:border-teal-500 bg-white",
              errors.address?.city && "border-red-300"
            )}>
              {loadingCommunes || loadingDepts ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <SelectValue placeholder={selectedProvinceId ? "Sélectionnez une ville..." : "Sélectionnez d'abord une province"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {filteredCommunes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.address?.city && (isSubmitted || touchedFields.address?.city || selectedCommuneId) && (
            <p className="text-xs text-red-500 mt-2">{errors.address.city.message}</p>
          )}
        </div>

        {/* Arrondissement */}
        <div className={cn(
          "relative p-5 rounded-2xl border-2 transition-all duration-300",
          selectedDistrictId 
            ? "border-cyan-400 bg-cyan-50/50" 
            : !selectedCommuneId
              ? "border-slate-200 bg-slate-50 opacity-60"
              : "border-cyan-200 bg-white hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              selectedDistrictId
                ? "bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/30"
                : !selectedCommuneId
                  ? "bg-slate-200"
                  : "bg-cyan-100"
            )}>
              <Navigation className={cn("w-5 h-5", selectedDistrictId ? "text-white" : !selectedCommuneId ? "text-slate-400" : "text-cyan-600")} />
            </div>
            <div className="flex-1">
              <Label className={cn("font-semibold text-sm", selectedDistrictId ? "text-cyan-700" : !selectedCommuneId ? "text-slate-400" : "text-slate-700")}>
                Arrondissement *
              </Label>
              {selectedDistrictId && (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-cyan-500" />
                  <span className="text-xs text-cyan-600">Sélectionné</span>
                </div>
              )}
            </div>
          </div>
          
          <Select 
            value={selectedDistrictId} 
            onValueChange={handleDistrictChange}
            disabled={!selectedCommuneId || loadingDistricts}
          >
            <SelectTrigger className={cn(
              "h-12 rounded-xl border-2 transition-all",
              selectedDistrictId 
                ? "border-cyan-300 bg-white" 
                : !selectedCommuneId
                  ? "border-slate-200 bg-slate-100"
                  : "border-cyan-200 hover:border-cyan-400 focus:border-cyan-500 bg-white",
              errors.address?.arrondissement && "border-red-300"
            )}>
              {loadingDistricts ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <SelectValue placeholder={selectedCommuneId ? "Sélectionnez un arrondissement..." : "Sélectionnez d'abord une ville"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {sortedDistricts.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.address?.arrondissement && (
            <p className="text-xs text-red-500 mt-2">{errors.address.arrondissement.message}</p>
          )}
        </div>

        {/* Quartier */}
        <div className={cn(
          "relative p-5 rounded-2xl border-2 transition-all duration-300",
          selectedQuarterId 
            ? "border-blue-400 bg-blue-50/50" 
            : !selectedDistrictId
              ? "border-slate-200 bg-slate-50 opacity-60"
              : "border-blue-200 bg-white hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10"
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              selectedQuarterId
                ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                : !selectedDistrictId
                  ? "bg-slate-200"
                  : "bg-blue-100"
            )}>
              <TreePine className={cn("w-5 h-5", selectedQuarterId ? "text-white" : !selectedDistrictId ? "text-slate-400" : "text-blue-600")} />
            </div>
            <div className="flex-1">
              <Label className={cn("font-semibold text-sm", selectedQuarterId ? "text-blue-700" : !selectedDistrictId ? "text-slate-400" : "text-slate-700")}>
                Quartier *
              </Label>
              {selectedQuarterId && (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600">Sélectionné</span>
                </div>
              )}
            </div>
          </div>
          
          <Select 
            value={selectedQuarterId}
            onValueChange={handleQuarterChange}
            disabled={!selectedDistrictId || loadingQuarters}
          >
            <SelectTrigger className={cn(
              "h-12 rounded-xl border-2 transition-all",
              selectedQuarterId 
                ? "border-blue-300 bg-white" 
                : !selectedDistrictId
                  ? "border-slate-200 bg-slate-100"
                  : "border-blue-200 hover:border-blue-400 focus:border-blue-500 bg-white",
              errors.address?.district && "border-red-300"
            )}>
              {loadingQuarters ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <SelectValue placeholder={selectedDistrictId ? "Sélectionnez un quartier..." : "Sélectionnez d'abord un arrondissement"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {sortedQuarters.map(q => (
                <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.address?.district && (isSubmitted || touchedFields.address?.district || selectedQuarterId) && (
            <p className="text-xs text-red-500 mt-2">{errors.address.district.message}</p>
          )}
        </div>
      </div>

      {/* Informations complémentaires */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-250">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Informations complémentaires</h3>
            <span className="text-xs text-slate-500">Optionnel - Aidez-nous à mieux vous localiser</span>
          </div>
        </div>
        
        <Textarea
          {...register('address.additionalInfo')}
          placeholder="Ex: Proche du marché Mont-Bouët, après la pharmacie centrale, bâtiment bleu à 2 étages..."
          rows={3}
          className="rounded-xl border-2 border-indigo-200 hover:border-indigo-400 focus:border-indigo-500 transition-all resize-none bg-white"
        />
        <p className="text-xs text-indigo-600 mt-2">
          💡 Ces détails aideront nos équipes à vous retrouver facilement
        </p>
      </div>

      {/* Récapitulatif de l'adresse (si complète) */}
      {progress === 4 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-300 animate-in fade-in-0 zoom-in-95 duration-500">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-green-800">Adresse complète !</h3>
              <p className="text-sm text-green-600">Votre localisation a été enregistrée</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-green-200 mt-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="font-medium text-slate-700">
                {watch('address.district')}, {watch('address.arrondissement')}, {watch('address.city')}, {watch('address.province')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
