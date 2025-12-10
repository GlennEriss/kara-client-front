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
import { quarterSchema, type QuarterFormData } from '@/schemas/geographie.schema'
import { useQuarters, useQuarterMutations, useDistricts, useCities, useProvinces } from '@/hooks/useGeographie'
import { toast } from 'sonner'
import { Plus, Search, Edit3, Trash2, Home, RefreshCw, Loader2 } from 'lucide-react'
import type { Quarter } from '@/types/types'

function QuarterSkeleton() {
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

export default function QuarterList() {
  const [search, setSearch] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [quarterToDelete, setQuarterToDelete] = useState<Quarter | null>(null)
  const [editingQuarter, setEditingQuarter] = useState<Quarter | null>(null)

  const { data: provinces = [] } = useProvinces()
  const { data: cities = [] } = useCities()
  const { data: districts = [] } = useDistricts()
  const { data: quarters = [], isLoading, error, refetch } = useQuarters(selectedDistrictId === 'all' ? undefined : selectedDistrictId)
  const { create, update, remove } = useQuarterMutations()

  const form = useForm<QuarterFormData>({
    resolver: zodResolver(quarterSchema),
    defaultValues: { districtId: '', name: '', displayOrder: undefined },
  })

  const filteredQuarters = useMemo(() => {
    let filtered = quarters
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((q) => q.name.toLowerCase().includes(searchLower))
    }
    return filtered
  }, [quarters, search])

  const openCreate = () => {
    setEditingQuarter(null)
    form.reset({ districtId: '', name: '', displayOrder: undefined })
    setIsCreateOpen(true)
  }

  const openEdit = (quarter: Quarter) => {
    setEditingQuarter(quarter)
    form.reset({
      districtId: quarter.districtId,
      name: quarter.name,
      displayOrder: quarter.displayOrder ?? undefined,
    })
    setIsCreateOpen(true)
  }

  const submitQuarter = async (values: QuarterFormData) => {
    try {
      if (editingQuarter) {
        await update.mutateAsync({ id: editingQuarter.id, data: values })
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
    if (!quarterToDelete) return
    try {
      await remove.mutateAsync(quarterToDelete.id)
      setIsDeleteOpen(false)
      setQuarterToDelete(null)
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
          <h2 className="text-2xl font-bold text-gray-900">Quartiers</h2>
          <p className="text-gray-600 mt-1">{filteredQuarters.length} quartier(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-[#234D65] hover:bg-[#234D65]/90 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nouveau Quartier
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
            <Select value={selectedDistrictId} onValueChange={setSelectedDistrictId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Tous les arrondissements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les arrondissements</SelectItem>
                {districts.map((district) => {
                  const city = cities.find((c) => c.id === district.cityId)
                  const province = city ? provinces.find((p) => p.id === city.provinceId) : null
                  return (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name} - {city?.name} {province && `(${province.name})`}
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
            Une erreur est survenue lors du chargement des quartiers
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <QuarterSkeleton key={i} />
          ))}
        </div>
      ) : filteredQuarters.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuarters.map((quarter) => {
            const district = districts.find((d) => d.id === quarter.districtId)
            const city = district ? cities.find((c) => c.id === district.cityId) : null
            const province = city ? provinces.find((p) => p.id === city.provinceId) : null
            return (
              <Card key={quarter.id} className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Home className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{quarter.name}</div>
                        <div className="text-sm text-gray-500">
                          {district?.name} - {city?.name} {province && `(${province.name})`}
                        </div>
                      </div>
                    </div>
                  </div>
                  {quarter.displayOrder !== undefined && (
                    <div className="text-xs text-gray-500 mb-3">
                      Ordre d'affichage: {quarter.displayOrder}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(quarter)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuarterToDelete(quarter)
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
            Aucun quartier trouvé
          </CardContent>
        </Card>
      )}

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuarter ? 'Modifier un quartier' : 'Nouveau quartier'}</DialogTitle>
            <DialogDescription>Renseignez les informations du quartier</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitQuarter)} className="space-y-4">
              <FormField
                control={form.control}
                name="districtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arrondissement</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un arrondissement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((district) => {
                          const city = cities.find((c) => c.id === district.cityId)
                          const province = city ? provinces.find((p) => p.id === city.provinceId) : null
                          return (
                            <SelectItem key={district.id} value={district.id}>
                              {district.name} - {city?.name} {province && `(${province.name})`}
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
                      <Input {...field} placeholder="Nkembo" />
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

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Supprimer définitivement "{quarterToDelete?.name}" ?
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

