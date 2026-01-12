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
import { districtSchema, districtBulkCreateSchema, type DistrictFormData, type DistrictBulkCreateFormData } from '../schemas/geographie.schema'
import { useDistricts, useDistrictMutations, useCommunes, useDepartments, useProvinces } from '../hooks/useGeographie'
import { Plus, Search, Edit3, Trash2, Map, Loader2, Download } from 'lucide-react'
import type { District } from '../entities/geography.types'

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
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [districtToDelete, setDistrictToDelete] = useState<District | null>(null)
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null)
  const [createMode, setCreateMode] = useState<'single' | 'bulk'>('bulk')

  const { data: provinces = [] } = useProvinces()
  const { data: departments = [] } = useDepartments(selectedProvinceId === 'all' ? undefined : selectedProvinceId)
  const { data: communes = [] } = useCommunes(selectedDepartmentId === 'all' ? undefined : selectedDepartmentId)
  const { data: districts = [], isLoading, error } = useDistricts(selectedCommuneId === 'all' ? undefined : selectedCommuneId)
  const { create, update, remove, createBulk } = useDistrictMutations()

  const form = useForm<DistrictFormData>({
    resolver: zodResolver(districtSchema),
    defaultValues: { communeId: '', name: '' },
  })

  const bulkForm = useForm<DistrictBulkCreateFormData>({
    resolver: zodResolver(districtBulkCreateSchema),
    defaultValues: { communeId: '', count: 1 },
  })

  // Sélections hiérarchiques pour les formulaires
  const [formProvinceId, setFormProvinceId] = useState<string>('all')
  const [formDepartmentId, setFormDepartmentId] = useState<string>('all')

  const departmentsForForm = useDepartments(formProvinceId === 'all' ? undefined : formProvinceId).data || []
  const communesForForm = useCommunes(formDepartmentId === 'all' ? undefined : formDepartmentId).data || []

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
      bulkForm.reset({ communeId: '', count: 1 })
      setIsBulkCreateOpen(true)
    } else {
      setEditingDistrict(null)
      form.reset({ communeId: '', name: '' })
      setIsCreateOpen(true)
    }
  }

  const submitBulkCreate = async (values: DistrictBulkCreateFormData) => {
    try {
      await createBulk.mutateAsync({ communeId: values.communeId, count: values.count })
      setIsBulkCreateOpen(false)
      // Le refetch est géré automatiquement par le hook
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const openEdit = (district: District) => {
    setEditingDistrict(district)
    form.reset({
      communeId: district.communeId,
      name: district.name,
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
      // React Query invalide automatiquement les queries après mutation
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
      // React Query invalide automatiquement les queries après mutation
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const exportCsv = () => {
    const headers = ['Arrondissement', 'Commune', 'Département', 'Province']
    const rows = filteredDistricts.map((district) => {
      const commune = communes.find((c) => c.id === district.communeId)
      const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
      const province = department ? provinces.find((p) => p.id === department.provinceId) : null
      return [
        district.name,
        commune?.name || '',
        department?.name || '',
        province?.name || '',
      ]
    })
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'arrondissements.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Arrondissements</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{filteredDistricts.length} arrondissement(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportCsv} 
            disabled={filteredDistricts.length === 0}
            className="text-xs sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button 
            size="sm" 
            onClick={openCreate} 
            className="bg-[#234D65] hover:bg-[#234D65]/90 text-white text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Nouvel Arrondissement</span>
            <span className="sm:hidden">Nouveau</span>
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
            <Select
              value={selectedProvinceId}
              onValueChange={(value) => {
                setSelectedProvinceId(value)
                setSelectedDepartmentId('all')
                setSelectedCommuneId('all')
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Toutes les provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les provinces</SelectItem>
                {provinces.map((province) => (
                  <SelectItem key={province.id} value={province.id}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedDepartmentId}
              onValueChange={(value) => {
                setSelectedDepartmentId(value)
                setSelectedCommuneId('all')
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Tous les départements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les départements</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCommuneId} onValueChange={setSelectedCommuneId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Toutes les communes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les communes</SelectItem>
                {communes.map((commune) => {
                  const department = departments.find((d) => d.id === commune.departmentId)
                  const province = department ? provinces.find((p) => p.id === department.provinceId) : null
                  return (
                    <SelectItem key={commune.id} value={commune.id}>
                      {commune.name} {department && `(${department.name})`} {province && `- ${province.name}`}
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
      ) : (
        (() => {
          const communesToShow =
            selectedCommuneId === 'all'
              ? communes
              : communes.filter((c) => c.id === selectedCommuneId)

          if (selectedCommuneId === 'all' && filteredDistricts.length === 0) {
            return (
              <Card>
                <CardContent className="text-center py-12">
                  Sélectionnez au moins une commune pour afficher les arrondissements.
                </CardContent>
              </Card>
            )
          }

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {communesToShow.map((commune) => {
                const department = departments.find((d) => d.id === commune.departmentId)
                const province = department ? provinces.find((p) => p.id === department.provinceId) : null
                const districtsForCommune = filteredDistricts.filter((d) => d.communeId === commune.id)

                if (districtsForCommune.length === 0) return null

                return (
                  <Card key={commune.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Map className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{commune.name}</div>
                            <div className="text-sm text-gray-500">
                              {department?.name} {province && `- ${province.name}`}
                            </div>
                            <div className="text-xs text-gray-400">
                              {districtsForCommune.length} arrondissement(s)
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {districtsForCommune.map((district) => (
                          <div
                            key={district.id}
                            className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 bg-white"
                          >
                            <div className="text-sm font-medium text-gray-800">{district.name}</div>
                            <div className="flex items-center gap-2">
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
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )
        })()
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
                name="communeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commune</FormLabel>
                    <div className="grid gap-3">
                      <Select
                        value={formProvinceId}
                        onValueChange={(value) => {
                          setFormProvinceId(value)
                          setFormDepartmentId('all')
                          field.onChange('')
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner une province</SelectItem>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.id}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={formDepartmentId}
                        onValueChange={(value) => {
                          setFormDepartmentId(value)
                          field.onChange('')
                        }}
                        disabled={formProvinceId === 'all'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Département" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner un département</SelectItem>
                          {departmentsForForm.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={field.onChange} value={field.value} disabled={formDepartmentId === 'all'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une commune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {communesForForm.map((commune) => (
                            <SelectItem key={commune.id} value={commune.id}>
                              {commune.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                      <Input {...field} placeholder="1er arrondissement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={create.isPending || update.isPending}
                  className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
                >
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
              Créez plusieurs arrondissements pour une commune. Les arrondissements seront nommés automatiquement : "1er arrondissement", "2ème arrondissement", etc.
            </DialogDescription>
          </DialogHeader>
          <Form {...bulkForm}>
            <form onSubmit={bulkForm.handleSubmit(submitBulkCreate)} className="space-y-4">
              <FormField
                control={bulkForm.control}
                name="communeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commune</FormLabel>
                    <div className="grid gap-3">
                      <Select
                        value={formProvinceId}
                        onValueChange={(value) => {
                          setFormProvinceId(value)
                          setFormDepartmentId('all')
                          field.onChange('')
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner une province</SelectItem>
                          {provinces.map((province) => (
                            <SelectItem key={province.id} value={province.id}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={formDepartmentId}
                        onValueChange={(value) => {
                          setFormDepartmentId(value)
                          field.onChange('')
                        }}
                        disabled={formProvinceId === 'all'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Département" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner un département</SelectItem>
                          {departmentsForForm.map((department) => (
                            <SelectItem key={department.id} value={department.id}>
                              {department.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={field.onChange} value={field.value} disabled={formDepartmentId === 'all'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une commune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {communesForForm.map((commune) => (
                            <SelectItem key={commune.id} value={commune.id}>
                              {commune.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                <Button 
                  type="submit" 
                  disabled={createBulk.isPending}
                  className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
                >
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



