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
import { departmentSchema, type DepartmentFormData } from '../../schemas/geographie.schema'
import { useDepartmentsV2, useDepartmentMutationsV2, useProvincesV2, useCommunesV2 } from '../../hooks/useGeographieV2'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { Plus, Search, Edit3, Trash2, Building2, Loader2, Download, MapPinned, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Department } from '../../entities/geography.types'

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

export default function DepartmentListV2() {
  const [search, setSearch] = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)

  // Hook V2 avec pagination et recherche côté serveur
  const { 
    data: departments, 
    isLoading, 
    error, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage,
    totalCount 
  } = useDepartmentsV2({ 
    search,
    parentId: selectedProvinceId === 'all' ? undefined : selectedProvinceId,
    pageSize: 5 // Réduire pour tester la pagination avec les données de test
  })

  const { data: provinces = [] } = useProvincesV2({ pageSize: 100 })
  const { create, update, remove } = useDepartmentMutationsV2()

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { provinceId: '', name: '', code: undefined },
  })

  // Comptage optimisé : ne pas charger toutes les communes juste pour compter
  const communeCountByDepartment = useMemo(() => {
    const counts: Record<string, number | undefined> = {}
    // Les comptages seront chargés à la demande si nécessaire
    return counts
  }, [])

  const openCreate = () => {
    setEditingDepartment(null)
    form.reset({ provinceId: '', name: '', code: undefined })
    setIsCreateOpen(true)
  }

  const openEdit = (department: Department) => {
    setEditingDepartment(department)
    form.reset({
      provinceId: department.provinceId,
      name: department.name,
      code: department.code ?? undefined,
    })
    setIsCreateOpen(true)
  }

  const submitDepartment = async (values: DepartmentFormData) => {
    try {
      if (editingDepartment) {
        await update.mutateAsync({ id: editingDepartment.id, data: values })
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
    if (!departmentToDelete) return
    try {
      await remove.mutateAsync(departmentToDelete.id)
      setIsDeleteOpen(false)
      setDepartmentToDelete(null)
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const exportCsv = () => {
    const headers = ['Département', 'Code', 'Province', 'Communes']
    const rows = departments.map((d) => {
      const province = provinces.find((p) => p.id === d.provinceId)
      return [d.name, d.code || '', province?.name || '', communeCountByDepartment[d.id] ?? '...']
    })
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'departements.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4" data-testid="department-list-v2">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-success/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-kara-success" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="department-list-title">
                  Départements
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="department-list-count">
                  {totalCount !== undefined ? `${totalCount} département(s)` : `${departments.length} département(s)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={departments.length === 0}
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
                data-testid="btn-new-department"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouveau Département</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-9 border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                data-testid="input-search-department"
              />
            </div>
            <Select value={selectedProvinceId} onValueChange={setSelectedProvinceId}>
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
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="department-list-error">
              <AlertDescription>Erreur lors du chargement des départements</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : departments.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="department-list-cards">
                {departments.map((department) => {
                  const province = provinces.find((p) => p.id === department.provinceId)
                  const communeCount = communeCountByDepartment[department.id] ?? '...'
                  return (
                    <div
                      key={department.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`department-card-${department.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-success/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-kara-success" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`department-name-${department.id}`}>
                          {department.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {department.code && (
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded" data-testid={`department-code-${department.id}`}>
                              {department.code}
                            </span>
                          )}
                          {province?.name && (
                            <span data-testid={`department-province-${department.id}`}>{province.name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPinned className="w-3 h-3" aria-hidden="true" />
                            <span data-testid={`department-commune-count-${department.id}`}>{communeCount}</span>
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
                            onClick={() => openEdit(department)}
                            className="cursor-pointer"
                            data-testid={`btn-edit-department-${department.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setDepartmentToDelete(department)
                              setIsDeleteOpen(true)
                            }}
                            className="cursor-pointer text-kara-error focus:text-kara-error"
                            data-testid={`btn-delete-department-${department.id}`}
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
                <Table data-testid="department-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Département</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Code</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Province</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-center">Communes</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((department) => {
                      const province = provinces.find((p) => p.id === department.provinceId)
                      const communeCount = communeCountByDepartment[department.id] ?? '...'
                      return (
                        <TableRow
                          key={department.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`department-row-${department.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-success/20 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-kara-success" aria-hidden="true" />
                              </div>
                              <span className="font-medium text-gray-900" data-testid={`department-name-desktop-${department.id}`}>
                                {department.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {department.code ? (
                              <Badge
                                variant="outline"
                                className="border-kara-primary-dark/30 text-kara-primary-dark bg-kara-primary-dark/5"
                                data-testid={`department-code-desktop-${department.id}`}
                              >
                                {department.code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`department-province-desktop-${department.id}`}>
                              {province?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <MapPinned className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                              <span className="text-sm text-muted-foreground" data-testid={`department-commune-count-desktop-${department.id}`}>
                                {communeCount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(department)}
                                className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-edit-department-desktop-${department.id}`}
                                aria-label={`Modifier ${department.name}`}
                              >
                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDepartmentToDelete(department)
                                  setIsDeleteOpen(true)
                                }}
                                className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                data-testid={`btn-delete-department-desktop-${department.id}`}
                                aria-label={`Supprimer ${department.name}`}
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
                  label="Charger plus de départements"
                />
              ) : departments.length > 0 ? (
                <div className="flex justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Tous les {totalCount ?? departments.length} département(s) sont affichés
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div
              className="text-center py-12 text-muted-foreground bg-kara-primary-dark/5 rounded-lg"
              data-testid="department-list-empty"
            >
              <Building2 className="w-12 h-12 mx-auto mb-3 text-kara-primary-dark/30" aria-hidden="true" />
              <p>Aucun département trouvé</p>
              <Button variant="link" onClick={openCreate} className="mt-2 text-kara-primary-dark">
                Créer un département
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-department-form">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark" data-testid="modal-department-title">
              {editingDepartment ? 'Modifier le département' : 'Nouveau département'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? 'Modifiez les informations du département'
                : 'Renseignez les informations du nouveau département'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitDepartment)} className="space-y-4">
              <FormField
                control={form.control}
                name="provinceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                          data-testid="select-department-province"
                        >
                          <SelectValue placeholder="Sélectionner une province" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
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
                    <FormLabel>Nom du département</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Libreville"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-department-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ex: LB"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-department-code"
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
                  data-testid="btn-cancel-department"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                  data-testid="btn-submit-department"
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {editingDepartment ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-department-delete">
          <DialogHeader>
            <DialogTitle className="text-kara-error">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le département <strong>"{departmentToDelete?.name}"</strong> ?
              <br />
              <span className="text-kara-error font-medium mt-2 block">
                ⚠️ Cette action supprimera également toutes les communes, arrondissements et quartiers associés.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="btn-cancel-delete-department"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
              data-testid="btn-confirm-delete-department"
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
