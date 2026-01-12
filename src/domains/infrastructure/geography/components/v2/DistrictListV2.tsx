"use client"
import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { districtSchema, districtBulkCreateSchema, type DistrictFormData, type DistrictBulkCreateFormData } from '../../schemas/geographie.schema'
import { useDistrictsV2, useDistrictMutationsV2, useCommunesV2, useDepartmentsV2, useProvincesV2, useQuartersV2 } from '../../hooks/useGeographieV2'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { Plus, Search, Edit3, Trash2, Route, Loader2, Download, Home, MoreVertical, Upload } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { District } from '../../entities/geography.types'

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export default function DistrictListV2() {
  const [search, setSearch] = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [districtToDelete, setDistrictToDelete] = useState<District | null>(null)
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null)
  const [formProvinceId, setFormProvinceId] = useState<string>('all')
  const [formDepartmentId, setFormDepartmentId] = useState<string>('all')

  // Hook V2 avec pagination et recherche côté serveur
  const { 
    data: districts, 
    isLoading, 
    error, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage,
    totalCount 
  } = useDistrictsV2({ 
    search,
    parentId: selectedCommuneId === 'all' ? undefined : selectedCommuneId,
    pageSize: 5 // Réduire pour tester la pagination avec les données de test
  })

  const { data: provinces = [] } = useProvincesV2({ pageSize: 100 })
  const { data: departments = [] } = useDepartmentsV2({ 
    parentId: selectedProvinceId === 'all' ? undefined : selectedProvinceId,
    pageSize: 100 
  })
  const { data: communes = [] } = useCommunesV2({ 
    parentId: selectedDepartmentId === 'all' ? undefined : selectedDepartmentId,
    pageSize: 100 
  })
  const { create, update, remove, createBulk } = useDistrictMutationsV2()

  const departmentsForForm = useDepartmentsV2({ 
    parentId: formProvinceId === 'all' ? undefined : formProvinceId,
    pageSize: 100 
  }).data || []
  const communesForForm = useCommunesV2({ 
    parentId: formDepartmentId === 'all' ? undefined : formDepartmentId,
    pageSize: 100 
  }).data || []

  const form = useForm<DistrictFormData>({
    resolver: zodResolver(districtSchema),
    defaultValues: { communeId: '', name: '' },
  })

  const bulkForm = useForm<DistrictBulkCreateFormData>({
    resolver: zodResolver(districtBulkCreateSchema),
    defaultValues: { communeId: '', count: 1 },
  })

  // Comptage optimisé : ne pas charger tous les quartiers juste pour compter
  const quarterCountByDistrict = useMemo(() => {
    const counts: Record<string, number | undefined> = {}
    // Les comptages seront chargés à la demande si nécessaire
    return counts
  }, [])

  const openCreate = () => {
    setEditingDistrict(null)
    form.reset({ communeId: '', name: '' })
    setFormProvinceId('all')
    setFormDepartmentId('all')
    setIsCreateOpen(true)
  }

  const openBulkCreate = () => {
    bulkForm.reset({ communeId: '', count: 1 })
    setFormProvinceId('all')
    setFormDepartmentId('all')
    setIsBulkCreateOpen(true)
  }

  const openEdit = (district: District) => {
    setEditingDistrict(district)
    const commune = communes.find((c) => c.id === district.communeId)
    const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
    const province = department ? provinces.find((p) => p.id === department.provinceId) : null
    setFormProvinceId(province?.id || 'all')
    setFormDepartmentId(department?.id || 'all')
    form.reset({ communeId: district.communeId, name: district.name })
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
      form.reset()
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const submitBulkCreate = async (values: DistrictBulkCreateFormData) => {
    try {
      await createBulk.mutateAsync({ communeId: values.communeId, count: values.count })
      setIsBulkCreateOpen(false)
      bulkForm.reset()
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const confirmDelete = async () => {
    if (!districtToDelete) return
    try {
      await remove.mutateAsync(districtToDelete.id)
      setIsDeleteOpen(false)
      setDistrictToDelete(null)
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const exportCsv = () => {
    const headers = ['Arrondissement', 'Commune', 'Département', 'Province', 'Quartiers']
    const rows = districts.map((d) => {
      const commune = communes.find((c) => c.id === d.communeId)
      const department = commune ? departments.find((dept) => dept.id === commune.departmentId) : null
      const province = department ? provinces.find((p) => p.id === department.provinceId) : null
      return [
        d.name,
        commune?.name || '',
        department?.name || '',
        province?.name || '',
        quarterCountByDistrict[d.id] ?? '...',
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
    <div className="space-y-4" data-testid="district-list-v2">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-primary-light/20 flex items-center justify-center">
                <Route className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="district-list-title">
                  Arrondissements
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="district-list-count">
                  {totalCount !== undefined ? `${totalCount} arrondissement(s)` : `${districts.length} arrondissement(s)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={districts.length === 0}
                className="border-kara-primary-dark/20 text-kara-primary-dark hover:bg-kara-primary-dark/5"
                data-testid="btn-export-csv"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openBulkCreate}
                className="border-kara-primary-dark/20 text-kara-primary-dark hover:bg-kara-primary-dark/5"
                data-testid="btn-bulk-create"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Créer en masse</span>
                <span className="sm:hidden">Masse</span>
              </Button>
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                data-testid="btn-new-district"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouvel Arrondissement</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                data-testid="input-search-district"
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
              <SelectTrigger className="w-full sm:w-[200px] border-kara-primary-dark/20">
                <SelectValue placeholder="Toutes les provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les provinces</SelectItem>
                {provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
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
              <SelectTrigger className="w-full sm:w-[200px] border-kara-primary-dark/20">
                <SelectValue placeholder="Tous les départements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les départements</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCommuneId} onValueChange={setSelectedCommuneId}>
              <SelectTrigger className="w-full sm:w-[200px] border-kara-primary-dark/20">
                <SelectValue placeholder="Toutes les communes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les communes</SelectItem>
                {communes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="district-list-error">
              <AlertDescription>Erreur lors du chargement des arrondissements</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : districts.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="district-list-cards">
                {districts.map((district) => {
                  const commune = communes.find((c) => c.id === district.communeId)
                  const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
                  const quarterCount = quarterCountByDistrict[district.id] ?? '...'
                  return (
                    <div
                      key={district.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`district-card-${district.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-primary-light/20 flex items-center justify-center shrink-0">
                        <Route className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`district-name-${district.id}`}>
                          {district.name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {commune?.name && (
                            <span data-testid={`district-commune-${district.id}`}>{commune.name}</span>
                          )}
                          {department?.name && (
                            <span data-testid={`district-department-${district.id}`}>• {department.name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Home className="w-3 h-3" aria-hidden="true" />
                            <span data-testid={`district-quarter-count-${district.id}`}>{quarterCount}</span>
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => openEdit(district)}
                            className="cursor-pointer"
                            data-testid={`btn-edit-district-${district.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDistrictToDelete(district)
                              setIsDeleteOpen(true)
                            }}
                            className="cursor-pointer text-kara-error focus:text-kara-error"
                            data-testid={`btn-delete-district-${district.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                })}
              </div>

              {/* Vue Table - Desktop/Tablette */}
              <div className="hidden sm:block rounded-lg border border-kara-primary-dark/10 overflow-hidden">
                <Table data-testid="district-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Arrondissement</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Commune</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Département</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-center">Quartiers</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {districts.map((district) => {
                      const commune = communes.find((c) => c.id === district.communeId)
                      const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
                      const quarterCount = quarterCountByDistrict[district.id] ?? '...'
                      return (
                        <TableRow
                          key={district.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`district-row-${district.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-primary-light/20 flex items-center justify-center">
                                <Route className="w-4 h-4 text-kara-primary-dark" aria-hidden="true" />
                              </div>
                              <span className="font-medium text-gray-900" data-testid={`district-name-desktop-${district.id}`}>
                                {district.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`district-commune-desktop-${district.id}`}>
                              {commune?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`district-department-desktop-${district.id}`}>
                              {department?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Home className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                              <span className="text-sm text-muted-foreground" data-testid={`district-quarter-count-desktop-${district.id}`}>
                                {quarterCount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(district)}
                                className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-edit-district-desktop-${district.id}`}
                                aria-label={`Modifier ${district.name}`}
                              >
                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDistrictToDelete(district)
                                  setIsDeleteOpen(true)
                                }}
                                className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                data-testid={`btn-delete-district-desktop-${district.id}`}
                                aria-label={`Supprimer ${district.name}`}
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {hasNextPage || isFetchingNextPage ? (
                <LoadMoreButton
                  hasMore={hasNextPage}
                  isLoading={isFetchingNextPage}
                  onLoadMore={fetchNextPage}
                  autoLoad={false}
                  label="Charger plus d'arrondissements"
                />
              ) : districts.length > 0 ? (
                <div className="flex justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Tous les {totalCount ?? districts.length} arrondissement(s) sont affichés
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div
              className="text-center py-12 text-muted-foreground bg-kara-primary-dark/5 rounded-lg"
              data-testid="district-list-empty"
            >
              <Route className="w-12 h-12 mx-auto mb-3 text-kara-primary-dark/30" aria-hidden="true" />
              <p>Aucun arrondissement trouvé</p>
              <Button variant="link" onClick={openCreate} className="mt-2 text-kara-primary-dark">
                Créer un arrondissement
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-district-form">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark" data-testid="modal-district-title">
              {editingDistrict ? 'Modifier l\'arrondissement' : 'Nouvel arrondissement'}
            </DialogTitle>
            <DialogDescription>
              {editingDistrict
                ? 'Modifiez les informations de l\'arrondissement'
                : 'Renseignez les informations du nouvel arrondissement'}
            </DialogDescription>
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
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-district-province"
                          >
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner une province</SelectItem>
                          {provinces.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
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
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-district-department"
                          >
                            <SelectValue placeholder="Département" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner un département</SelectItem>
                          {departmentsForForm.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={field.onChange} value={field.value} disabled={formDepartmentId === 'all'}>
                        <FormControl>
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-district-commune"
                          >
                            <SelectValue placeholder="Sélectionner une commune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {communesForForm.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                    <FormLabel>Nom de l'arrondissement</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: 1er arrondissement"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-district-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-kara-primary-dark/20"
                  data-testid="btn-cancel-district"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                  data-testid="btn-submit-district"
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {editingDistrict ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal création en masse */}
      <Dialog open={isBulkCreateOpen} onOpenChange={setIsBulkCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-district-bulk-form">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark">Créer des arrondissements en masse</DialogTitle>
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
                          <SelectTrigger className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30">
                            <SelectValue placeholder="Province" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner une province</SelectItem>
                          {provinces.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
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
                          <SelectTrigger className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30">
                            <SelectValue placeholder="Département" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner un département</SelectItem>
                          {departmentsForForm.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={field.onChange} value={field.value} disabled={formDepartmentId === 'all'}>
                        <FormControl>
                          <SelectTrigger className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30">
                            <SelectValue placeholder="Sélectionner une commune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {communesForForm.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
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
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-district-count"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Les arrondissements seront créés avec les noms : "1er arrondissement", "2ème arrondissement", etc.
                    </p>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBulkCreateOpen(false)}
                  className="border-kara-primary-dark/20"
                  data-testid="btn-cancel-bulk-district"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createBulk.isPending}
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                  data-testid="btn-submit-bulk-district"
                >
                  {createBulk.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Créer les arrondissements
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-district-delete">
          <DialogHeader>
            <DialogTitle className="text-kara-error">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'arrondissement <strong>"{districtToDelete?.name}"</strong> ?
              <br />
              <span className="text-kara-error font-medium mt-2 block">
                ⚠️ Cette action supprimera également tous les quartiers associés.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="btn-cancel-delete-district"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
              data-testid="btn-confirm-delete-district"
            >
              {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
