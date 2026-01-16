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
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quarterSchema, type QuarterFormData } from '../../schemas/geographie.schema'
import { useQuartersV2, useQuarterMutationsV2, useDistrictsV2, useCommunesV2, useDepartmentsV2, useProvincesV2 } from '../../hooks/useGeographieV2'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { Plus, Search, Edit3, Trash2, Home, Loader2, Download, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Quarter } from '../../entities/geography.types'

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

export default function QuarterListV2() {
  const [search, setSearch] = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [selectedCommuneId, setSelectedCommuneId] = useState<string>('all')
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [quarterToDelete, setQuarterToDelete] = useState<Quarter | null>(null)
  const [editingQuarter, setEditingQuarter] = useState<Quarter | null>(null)
  const [formProvinceId, setFormProvinceId] = useState<string>('all')
  const [formDepartmentId, setFormDepartmentId] = useState<string>('all')
  const [formCommuneId, setFormCommuneId] = useState<string>('all')

  // Hook V2 avec pagination et recherche côté serveur
  const { 
    data: quarters, 
    isLoading, 
    error, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage,
    totalCount 
  } = useQuartersV2({ 
    search,
    parentId: selectedDistrictId === 'all' ? undefined : selectedDistrictId,
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
  const { data: districts = [] } = useDistrictsV2({ 
    parentId: selectedCommuneId === 'all' ? undefined : selectedCommuneId,
    pageSize: 100 
  })
  const { create, update, remove } = useQuarterMutationsV2()

  const departmentsForForm = useDepartmentsV2({ 
    parentId: formProvinceId === 'all' ? undefined : formProvinceId,
    pageSize: 100 
  }).data || []
  const communesForForm = useCommunesV2({ 
    parentId: formDepartmentId === 'all' ? undefined : formDepartmentId,
    pageSize: 100 
  }).data || []
  const districtsForForm = useDistrictsV2({ 
    parentId: formCommuneId === 'all' ? undefined : formCommuneId,
    pageSize: 100 
  }).data || []

  const form = useForm<QuarterFormData>({
    resolver: zodResolver(quarterSchema),
    defaultValues: { districtId: '', name: '' },
  })

  const openCreate = () => {
    setEditingQuarter(null)
    form.reset({ districtId: '', name: '' })
    setFormProvinceId('all')
    setFormDepartmentId('all')
    setFormCommuneId('all')
    setIsCreateOpen(true)
  }

  const openEdit = (quarter: Quarter) => {
    setEditingQuarter(quarter)
    const district = districts.find((d) => d.id === quarter.districtId)
    const commune = district ? communes.find((c) => c.id === district.communeId) : null
    const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
    const province = department ? provinces.find((p) => p.id === department.provinceId) : null
    setFormProvinceId(province?.id || 'all')
    setFormDepartmentId(department?.id || 'all')
    setFormCommuneId(commune?.id || 'all')
    form.reset({ districtId: quarter.districtId, name: quarter.name })
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
      form.reset()
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const confirmDelete = async () => {
    if (!quarterToDelete) return
    try {
      await remove.mutateAsync(quarterToDelete.id)
      setIsDeleteOpen(false)
      setQuarterToDelete(null)
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const exportCsv = () => {
    const headers = ['Quartier', 'Arrondissement', 'Commune', 'Département', 'Province']
    const rows = quarters.map((q) => {
      const district = districts.find((d) => d.id === q.districtId)
      const commune = district ? communes.find((c) => c.id === district.communeId) : null
      const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
      const province = department ? provinces.find((p) => p.id === department.provinceId) : null
      return [
        q.name,
        district?.name || '',
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
    link.download = 'quartiers.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4" data-testid="quarter-list-v2">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-error/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-kara-error" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="quarter-list-title">
                  Quartiers
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="quarter-list-count">
                  {totalCount !== undefined ? `${totalCount} quartier(s)` : `${quarters.length} quartier(s)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={quarters.length === 0}
                className="border-kara-primary-dark/20 text-kara-primary-dark hover:bg-kara-primary-dark/5"
                data-testid="btn-export-csv"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                size="sm"
                onClick={openCreate}
                className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                data-testid="btn-new-quarter"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouveau Quartier</span>
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
                data-testid="input-search-quarter"
              />
            </div>
            <Select
              value={selectedProvinceId}
              onValueChange={(value) => {
                setSelectedProvinceId(value)
                setSelectedDepartmentId('all')
                setSelectedCommuneId('all')
                setSelectedDistrictId('all')
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
                setSelectedDistrictId('all')
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
            <Select
              value={selectedCommuneId}
              onValueChange={(value) => {
                setSelectedCommuneId(value)
                setSelectedDistrictId('all')
              }}
            >
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
            <Select value={selectedDistrictId} onValueChange={setSelectedDistrictId}>
              <SelectTrigger className="w-full sm:w-[200px] border-kara-primary-dark/20">
                <SelectValue placeholder="Tous les arrondissements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les arrondissements</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="quarter-list-error">
              <AlertDescription>Erreur lors du chargement des quartiers</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : quarters.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="quarter-list-cards">
                {quarters.map((quarter) => {
                  const district = districts.find((d) => d.id === quarter.districtId)
                  const commune = district ? communes.find((c) => c.id === district.communeId) : null
                  const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
                  return (
                    <div
                      key={quarter.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`quarter-card-${quarter.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-error/20 flex items-center justify-center shrink-0">
                        <Home className="w-5 h-5 text-kara-error" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`quarter-name-${quarter.id}`}>
                          {quarter.name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {district?.name && (
                            <span data-testid={`quarter-district-${quarter.id}`}>{district.name}</span>
                          )}
                          {commune?.name && (
                            <span data-testid={`quarter-commune-${quarter.id}`}>• {commune.name}</span>
                          )}
                          {department?.name && (
                            <span data-testid={`quarter-department-${quarter.id}`}>• {department.name}</span>
                          )}
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
                            onClick={() => openEdit(quarter)}
                            className="cursor-pointer"
                            data-testid={`btn-edit-quarter-${quarter.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setQuarterToDelete(quarter)
                              setIsDeleteOpen(true)
                            }}
                            className="cursor-pointer text-kara-error focus:text-kara-error"
                            data-testid={`btn-delete-quarter-${quarter.id}`}
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
                <Table data-testid="quarter-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Quartier</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Arrondissement</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Commune</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Département</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quarters.map((quarter) => {
                      const district = districts.find((d) => d.id === quarter.districtId)
                      const commune = district ? communes.find((c) => c.id === district.communeId) : null
                      const department = commune ? departments.find((d) => d.id === commune.departmentId) : null
                      return (
                        <TableRow
                          key={quarter.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`quarter-row-${quarter.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-error/20 flex items-center justify-center">
                                <Home className="w-4 h-4 text-kara-error" aria-hidden="true" />
                              </div>
                              <span className="font-medium text-gray-900" data-testid={`quarter-name-desktop-${quarter.id}`}>
                                {quarter.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`quarter-district-desktop-${quarter.id}`}>
                              {district?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`quarter-commune-desktop-${quarter.id}`}>
                              {commune?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`quarter-department-desktop-${quarter.id}`}>
                              {department?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(quarter)}
                                className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-edit-quarter-desktop-${quarter.id}`}
                                aria-label={`Modifier ${quarter.name}`}
                              >
                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setQuarterToDelete(quarter)
                                  setIsDeleteOpen(true)
                                }}
                                className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                data-testid={`btn-delete-quarter-desktop-${quarter.id}`}
                                aria-label={`Supprimer ${quarter.name}`}
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
                  label="Charger plus de quartiers"
                />
              ) : quarters.length > 0 ? (
                <div className="flex justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Tous les {totalCount ?? quarters.length} quartier(s) sont affichés
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div
              className="text-center py-12 text-muted-foreground bg-kara-primary-dark/5 rounded-lg"
              data-testid="quarter-list-empty"
            >
              <Home className="w-12 h-12 mx-auto mb-3 text-kara-primary-dark/30" aria-hidden="true" />
              <p>Aucun quartier trouvé</p>
              <Button variant="link" onClick={openCreate} className="mt-2 text-kara-primary-dark">
                Créer un quartier
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-quarter-form">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark" data-testid="modal-quarter-title">
              {editingQuarter ? 'Modifier le quartier' : 'Nouveau quartier'}
            </DialogTitle>
            <DialogDescription>
              {editingQuarter
                ? 'Modifiez les informations du quartier'
                : 'Renseignez les informations du nouveau quartier'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitQuarter)} className="space-y-4">
              <FormField
                control={form.control}
                name="districtId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arrondissement</FormLabel>
                    <div className="grid gap-3">
                      <Select
                        value={formProvinceId}
                        onValueChange={(value) => {
                          setFormProvinceId(value)
                          setFormDepartmentId('all')
                          setFormCommuneId('all')
                          field.onChange('')
                        }}
                      >
                        <FormControl>
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-quarter-province"
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
                          setFormCommuneId('all')
                          field.onChange('')
                        }}
                        disabled={formProvinceId === 'all'}
                      >
                        <FormControl>
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-quarter-department"
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

                      <Select
                        value={formCommuneId}
                        onValueChange={(value) => {
                          setFormCommuneId(value)
                          field.onChange('')
                        }}
                        disabled={formDepartmentId === 'all'}
                      >
                        <FormControl>
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-quarter-commune"
                          >
                            <SelectValue placeholder="Commune" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Sélectionner une commune</SelectItem>
                          {communesForForm.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select onValueChange={field.onChange} value={field.value} disabled={formCommuneId === 'all'}>
                        <FormControl>
                          <SelectTrigger 
                            className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                            data-testid="select-quarter-district"
                          >
                            <SelectValue placeholder="Sélectionner un arrondissement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {districtsForForm.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
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
                    <FormLabel>Nom du quartier</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Centre-ville"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-quarter-name"
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
                  data-testid="btn-cancel-quarter"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                  data-testid="btn-submit-quarter"
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {editingQuarter ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-quarter-delete">
          <DialogHeader>
            <DialogTitle className="text-kara-error">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le quartier <strong>"{quarterToDelete?.name}"</strong> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="btn-cancel-delete-quarter"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
              data-testid="btn-confirm-delete-quarter"
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
