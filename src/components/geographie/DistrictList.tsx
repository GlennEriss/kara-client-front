"use client"
import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { districtSchema, districtBulkCreateSchema, type DistrictFormData, type DistrictBulkCreateFormData } from '@/schemas/geographie.schema'
import { useDistricts, useDistrictMutations, useCities, useProvinces } from '@/hooks/useGeographie'
import { toast } from 'sonner'
import { Plus, Search, Edit3, Trash2, Map, RefreshCw, Loader2 } from 'lucide-react'
import type { District } from '@/types/types'

function DistrictSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function DistrictList() {
  const [search, setSearch] = useState('')
  const [selectedCityId, setSelectedCityId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [districtToDelete, setDistrictToDelete] = useState<District | null>(null)
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null)
  const [createMode, setCreateMode] = useState<'single' | 'bulk'>('bulk')

  const { data: provinces = [] } = useProvinces()
  const { data: cities = [] } = useCities()
  const { data: districts = [], isLoading, error, refetch } = useDistricts(selectedCityId === 'all' ? undefined : selectedCityId)
  const { create, update, remove, createBulk } = useDistrictMutations()

  const form = useForm<DistrictFormData>({
    resolver: zodResolver(districtSchema),
    defaultValues: { cityId: '', name: '', displayOrder: undefined },
  })

  const bulkForm = useForm<DistrictBulkCreateFormData>({
    resolver: zodResolver(districtBulkCreateSchema),
    defaultValues: { cityId: '', count: 1 },
  })

  const filteredDistricts = useMemo(() => {
    let filtered = districts
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(searchLower))
    }
    return filtered
  }, [districts, search])

  const openCreate = () => {
    if (createMode === 'bulk') {
      setEditingDistrict(null)
      bulkForm.reset({ cityId: '', count: 1 })
      setIsBulkCreateOpen(true)
    } else {
      setEditingDistrict(null)
      form.reset({ cityId: '', name: '', displayOrder: undefined })
      setIsCreateOpen(true)
    }
  }

  const submitBulkCreate = async (values: DistrictBulkCreateFormData) => {
    try {
      await createBulk.mutateAsync({ cityId: values.cityId, count: values.count })
      setIsBulkCreateOpen(false)
      // Le refetch est géré automatiquement par le hook
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const openEdit = (district: District) => {
    setEditingDistrict(district)
    form.reset({
      cityId: district.cityId,
      name: district.name,
      displayOrder: district.displayOrder ?? undefined,
    })
    setIsCreateOpen(true)
  }

  const submitDistrict = async (values: DistrictFormData) => {
    try {
      if (editingDistrict) {
        await update.mutateAsync({ id: editingDistrict.id, data: values })
      } else {
        await create.mutateAsync(values)
      }
      setIsCreateOpen(false)
      await refetch()
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const confirmDelete = async () => {
    if (!districtToDelete) return
    try {
      await remove.mutateAsync(districtToDelete.id)
      setIsDeleteOpen(false)
      setDistrictToDelete(null)
      await refetch()
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Arrondissements</h2>
          <p className="text-gray-600 mt-1">{filteredDistricts.length} arrondissement(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-[#234D65] hover:bg-[#234D65]/90 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nouvel Arrondissement
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom..."
                className="pl-9"
              />
            </div>
            <Select value={selectedCityId} onValueChange={setSelectedCityId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les villes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((city) => {
                  const province = provinces.find((p) => p.id === city.provinceId)
                  return (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name} {province && `(${province.name})`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Une erreur est survenue lors du chargement des arrondissements
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <DistrictSkeleton key={i} />
          ))}
        </div>
      ) : filteredDistricts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDistricts.map((district) => {
            const city = cities.find((c) => c.id === district.cityId)
            const province = city ? provinces.find((p) => p.id === city.provinceId) : null
            return (
              <Card key={district.id} className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Map className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{district.name}</div>
                        <div className="text-sm text-gray-500">
                          {city?.name} {province && `(${province.name})`}
                        </div>
                      </div>
                    </div>
                  </div>
                  {district.displayOrder !== undefined && (
                    <div className="text-xs text-gray-500 mb-3">
                      Ordre d'affichage: {district.displayOrder}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(district)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDistrictToDelete(district)
                        setIsDeleteOpen(true)
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            Aucun arrondissement trouvé
          </CardContent>
        </Card>
      )}

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDistrict ? 'Modifier un arrondissement' : 'Nouvel arrondissement'}
            </DialogTitle>
            <DialogDescription>Renseignez les informations de l'arrondissement</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitDistrict)} className="space-y-4">
              <FormField
                control={form.control}
                name="cityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une ville" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((city) => {
                          const province = provinces.find((p) => p.id === city.provinceId)
                          return (
                            <SelectItem key={city.id} value={city.id}>
                              {city.name} {province && `(${province.name})`}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Akanda" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordre d'affichage (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                          field.onChange(isNaN(value as number) ? undefined : value)
                        }}
                        placeholder="1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal création en masse */}
      <Dialog open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer des arrondissements en masse</DialogTitle>
            <DialogDescription>
              Créez plusieurs arrondissements pour une ville. Les arrondissements seront nommés automatiquement : "1er arrondissement", "2ème arrondissement", etc.
            </DialogDescription>
          </DialogHeader>
          <Form {...bulkForm}>
            <form onSubmit={bulkForm.handleSubmit(submitBulkCreate)} className="space-y-4">
              <FormField
                control={bulkForm.control}
                name="cityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une ville" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((city) => {
                          const province = provinces.find((p) => p.id === city.provinceId)
                          return (
                            <SelectItem key={city.id} value={city.id}>
                              {city.name} {province && `(${province.name})`}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bulkForm.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d'arrondissements</FormLabel>
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
                <Button type="button" variant="outline" onClick={() => setIsBulkCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createBulk.isPending}>
                  {createBulk.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer les arrondissements
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Supprimer définitivement "{districtToDelete?.name}" ?
              <br />
              <span className="text-red-600 font-medium">
                Cette action supprimera également tous les quartiers associés.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={remove.isPending}>
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

