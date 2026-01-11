'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useDistrictMutations, useProvinces, useDepartments, useCommunes } from '../../hooks/useGeographie'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { districtBulkCreateSchema, type DistrictBulkCreateFormData } from '../../schemas/geographie.schema'
import type { Commune, Department } from '../../entities/geography.types'
import AddCommuneModal from './AddCommuneModal'
import AddDepartmentModal from './AddDepartmentModal'

interface AddDistrictModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newDistricts: any[]) => void // Retourne un tableau car création en masse
  communeId?: string // Commune pré-sélectionnée si disponible
}

export default function AddDistrictModal({ open, onClose, onSuccess, communeId }: AddDistrictModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddCommuneModal, setShowAddCommuneModal] = useState(false)
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false)
  
  // États pour la sélection en cascade (utiliser 'all' comme dans DistrictList.tsx)
  const [formProvinceId, setFormProvinceId] = useState<string>('all')
  const [formDepartmentId, setFormDepartmentId] = useState<string>('all')
  
  const districtMutations = useDistrictMutations()
  const queryClient = useQueryClient()
  
  // Utiliser le schéma de création en masse (comme dans DistrictList.tsx)
  const form = useForm<DistrictBulkCreateFormData>({
    resolver: zodResolver(districtBulkCreateSchema),
    defaultValues: {
      communeId: communeId || '',
      count: 1,
    }
  })

  // Charger les données hiérarchiques (comme dans DistrictList.tsx)
  const { data: provinces = [], isLoading: isLoadingProvinces } = useProvinces()
  const { data: departmentsForForm = [], isLoading: isLoadingDepartments } = useDepartments(
    formProvinceId === 'all' ? undefined : formProvinceId
  )
  const { data: communesForForm = [], isLoading: isLoadingCommunes } = useCommunes(
    formDepartmentId === 'all' ? undefined : formDepartmentId
  )

  // Trier les données par ordre alphabétique
  const sortedProvinces = useMemo(() => {
    return [...provinces].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [provinces])

  const sortedDepartments = useMemo(() => {
    return [...departmentsForForm].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [departmentsForForm])

  const sortedCommunes = useMemo(() => {
    return [...communesForForm].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [communesForForm])

  const selectedCommuneId = form.watch('communeId')
  const selectedCount = form.watch('count')

  // Si communeId est fourni en prop, charger la hiérarchie complète
  useEffect(() => {
    if (communeId && !form.getValues('communeId')) {
      form.setValue('communeId', communeId)
      // TODO: Charger la province et département à partir de la commune
      // Pour l'instant, on laisse l'utilisateur naviguer manuellement
    }
  }, [communeId, form])

  // Handlers pour les créations en cascade
  const handleDepartmentCreated = (newDepartment: Department) => {
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    setFormDepartmentId(newDepartment.id)
    toast.success(`Département "${newDepartment.name}" créé et sélectionné`)
    setShowAddDepartmentModal(false)
  }

  const handleCommuneCreated = (newCommune: Commune) => {
    queryClient.invalidateQueries({ queryKey: ['communes'] })
    form.setValue('communeId', newCommune.id, { shouldValidate: true })
    toast.success(`Commune "${newCommune.name}" créée et sélectionnée`)
    setShowAddCommuneModal(false)
  }

  const handleSubmit = async (data: DistrictBulkCreateFormData) => {
    setIsSubmitting(true)
    try {
      // Utiliser createBulk pour créer plusieurs arrondissements en masse
      await districtMutations.createBulk.mutateAsync({ 
        communeId: data.communeId, 
        count: data.count 
      })
      // Le toast est déjà géré par le hook
      form.reset({ communeId: '', count: 1 })
      setFormProvinceId('all')
      setFormDepartmentId('all')
      onSuccess([]) // Passer un tableau vide car on ne retourne pas les districts créés individuellement
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la création des arrondissements:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer des arrondissements en masse</DialogTitle>
            <DialogDescription>
              Créez plusieurs arrondissements pour une commune. Les arrondissements seront nommés automatiquement : "1er arrondissement", "2ème arrondissement", etc.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="communeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commune <span className="text-red-500">*</span></FormLabel>
                    <div className="grid gap-3">
                      {/* 1. Sélection de la Province */}
                      <Select
                        value={formProvinceId}
                        onValueChange={(value) => {
                          setFormProvinceId(value)
                          setFormDepartmentId('all')
                          field.onChange('')
                        }}
                        disabled={!!communeId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            communeId 
                              ? "Province pré-sélectionnée" 
                              : isLoadingProvinces
                              ? "Chargement..."
                              : "Sélectionner une province"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingProvinces ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                            </div>
                          ) : (
                            <>
                              <SelectItem value="all">Sélectionner une province</SelectItem>
                              {sortedProvinces.map((province) => (
                                <SelectItem key={province.id} value={province.id}>
                                  {province.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>

                      {/* 2. Sélection du Département (filtré par province) */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={formDepartmentId}
                          onValueChange={(value) => {
                            setFormDepartmentId(value)
                            field.onChange('')
                          }}
                          disabled={formProvinceId === 'all' || !!communeId || isLoadingDepartments}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={
                              formProvinceId === 'all'
                                ? "Sélectionnez d'abord une province"
                                : isLoadingDepartments
                                ? "Chargement..."
                                : sortedDepartments.length === 0
                                ? "Aucun département disponible"
                                : "Sélectionner un département"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingDepartments ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                              </div>
                            ) : sortedDepartments.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Aucun département disponible pour cette province
                              </div>
                            ) : (
                              <>
                                <SelectItem value="all">Sélectionner un département</SelectItem>
                                {sortedDepartments.map((department) => (
                                  <SelectItem key={department.id} value={department.id}>
                                    {department.name}
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {formProvinceId !== 'all' && !communeId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowAddDepartmentModal(true)}
                            className="h-10 w-10 flex-shrink-0"
                            title="Créer un nouveau département"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* 3. Sélection de la Commune (filtrée par département) */}
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={formDepartmentId === 'all' || !!communeId || isLoadingCommunes}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={
                              communeId
                                ? "Commune pré-sélectionnée"
                                : formDepartmentId === 'all'
                                ? "Sélectionnez d'abord un département"
                                : isLoadingCommunes
                                ? "Chargement..."
                                : sortedCommunes.length === 0
                                ? "Aucune commune disponible"
                                : "Sélectionner une commune"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingCommunes ? (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                              </div>
                            ) : sortedCommunes.length === 0 ? (
                              <div className="p-4 text-center text-sm text-gray-500">
                                Aucune commune disponible pour ce département
                              </div>
                            ) : (
                              sortedCommunes.map((commune) => (
                                <SelectItem key={commune.id} value={commune.id}>
                                  {commune.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {formDepartmentId !== 'all' && !communeId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowAddCommuneModal(true)}
                            className="h-10 w-10 flex-shrink-0"
                            title="Créer une nouvelle commune"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d'arrondissements <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          field.onChange(isNaN(value) ? 1 : Math.max(1, Math.min(50, value)))
                        }}
                        min={1}
                        max={50}
                        placeholder="5"
                        autoFocus={!!communeId}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-gray-500">
                      Les arrondissements seront créés avec les noms : "1er arrondissement", "2ème arrondissement", etc.
                    </p>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !selectedCommuneId || !selectedCount || selectedCount < 1}
                  className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer les arrondissements'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modals de création en cascade */}
      <AddDepartmentModal
        open={showAddDepartmentModal}
        onClose={() => setShowAddDepartmentModal(false)}
        onSuccess={handleDepartmentCreated}
        provinceId={formProvinceId === 'all' ? undefined : formProvinceId}
      />
      <AddCommuneModal
        open={showAddCommuneModal}
        onClose={() => setShowAddCommuneModal(false)}
        onSuccess={handleCommuneCreated}
        provinceId={formProvinceId === 'all' ? undefined : formProvinceId}
      />
    </>
  )
}
