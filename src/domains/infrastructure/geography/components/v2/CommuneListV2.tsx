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
import { communeSchema, type CommuneFormData } from '../../schemas/geographie.schema'
import { useCommunesV2, useCommuneMutationsV2, useDepartmentsV2, useProvincesV2, useDistrictsV2 } from '../../hooks/useGeographieV2'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { Plus, Search, Edit3, Trash2, MapPinned, Loader2, Download, Route, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Commune } from '../../entities/geography.types'

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

export default function CommuneListV2() {
  const [search, setSearch] = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [communeToDelete, setCommuneToDelete] = useState<Commune | null>(null)
  const [editingCommune, setEditingCommune] = useState<Commune | null>(null)

  // Hook V2 avec pagination et recherche côté serveur
  const { 
    data: communes, 
    isLoading, 
    error, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage,
    totalCount 
  } = useCommunesV2({ 
    search,
    parentId: selectedDepartmentId === 'all' ? undefined : selectedDepartmentId,
    pageSize: 5 // Réduire pour tester la pagination avec les données de test
  })

  const { data: provinces = [] } = useProvincesV2({ pageSize: 100 })
  const { data: departments = [] } = useDepartmentsV2({ 
    parentId: selectedProvinceId === 'all' ? undefined : selectedProvinceId,
    pageSize: 100 
  })
  const { create, update, remove } = useCommuneMutationsV2()

  const form = useForm<CommuneFormData>({
    resolver: zodResolver(communeSchema),
    defaultValues: { departmentId: '', name: '', postalCode: undefined, alias: undefined },
  })

  // Comptage optimisé : ne pas charger tous les districts juste pour compter
  const districtCountByCommune = useMemo(() => {
    const counts: Record<string, number | undefined> = {}
    // Les comptages seront chargés à la demande si nécessaire
    return counts
  }, [])

  const openCreate = () => {
    setEditingCommune(null)
    form.reset({ departmentId: '', name: '', postalCode: undefined, alias: undefined })
    setIsCreateOpen(true)
  }

  const openEdit = (commune: Commune) => {
    setEditingCommune(commune)
    form.reset({
      departmentId: commune.departmentId,
      name: commune.name,
      postalCode: commune.postalCode ?? undefined,
      alias: commune.alias ?? undefined,
    })
    setIsCreateOpen(true)
  }

  const submitCommune = async (values: CommuneFormData) => {
    try {
      if (editingCommune) {
        await update.mutateAsync({ id: editingCommune.id, data: values })
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
    if (!communeToDelete) return
    try {
      await remove.mutateAsync(communeToDelete.id)
      setIsDeleteOpen(false)
      setCommuneToDelete(null)
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const exportCsv = () => {
    const headers = ['Commune', 'Alias', 'Code postal', 'Département', 'Province', 'Arrondissements']
    const rows = communes.map((c) => {
      const department = departments.find((d) => d.id === c.departmentId)
      const province = department ? provinces.find((p) => p.id === department.provinceId) : null
      return [
        c.name,
        c.alias || '',
        c.postalCode || '',
        department?.name || '',
        province?.name || '',
        districtCountByCommune[c.id] ?? '...',
      ]
    })
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'communes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4" data-testid="commune-list-v2">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-warning/10 flex items-center justify-center">
                <MapPinned className="w-5 h-5 text-kara-warning" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="commune-list-title">
                  Communes
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="commune-list-count">
                  {totalCount !== undefined ? `${totalCount} commune(s)` : `${communes.length} commune(s)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={communes.length === 0}
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
                data-testid="btn-new-commune"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouvelle Commune</span>
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
                data-testid="input-search-commune"
              />
            </div>
            <Select
              value={selectedProvinceId}
              onValueChange={(value) => {
                setSelectedProvinceId(value)
                setSelectedDepartmentId('all')
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
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
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
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="commune-list-error">
              <AlertDescription>Erreur lors du chargement des communes</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : communes.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="commune-list-cards">
                {communes.map((commune) => {
                  const department = departments.find((d) => d.id === commune.departmentId)
                  const districtCount = districtCountByCommune[commune.id] ?? '...'
                  return (
                    <div
                      key={commune.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`commune-card-${commune.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-warning/20 flex items-center justify-center shrink-0">
                        <MapPinned className="w-5 h-5 text-kara-warning" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`commune-name-${commune.id}`}>
                          {commune.name}
                          {commune.alias && (
                            <span className="text-xs text-muted-foreground ml-1 italic font-normal" data-testid={`commune-alias-${commune.id}`}>
                              ({commune.alias})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {commune.postalCode && (
                            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded" data-testid={`commune-postal-code-${commune.id}`}>
                              {commune.postalCode}
                            </span>
                          )}
                          {department?.name && (
                            <span data-testid={`commune-department-${commune.id}`}>{department.name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Route className="w-3 h-3" aria-hidden="true" />
                            <span data-testid={`commune-district-count-${commune.id}`}>{districtCount}</span>
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
                            onClick={() => openEdit(commune)}
                            className="cursor-pointer"
                            data-testid={`btn-edit-commune-${commune.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCommuneToDelete(commune)
                              setIsDeleteOpen(true)
                            }}
                            className="cursor-pointer text-kara-error focus:text-kara-error"
                            data-testid={`btn-delete-commune-${commune.id}`}
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
                <Table data-testid="commune-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Commune</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Code postal</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Département</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-center">Arrondissements</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communes.map((commune) => {
                      const department = departments.find((d) => d.id === commune.departmentId)
                      const districtCount = districtCountByCommune[commune.id] ?? '...'
                      return (
                        <TableRow
                          key={commune.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`commune-row-${commune.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-warning/20 flex items-center justify-center">
                                <MapPinned className="w-4 h-4 text-kara-warning" aria-hidden="true" />
                              </div>
                              <div>
                                <span className="font-medium text-gray-900" data-testid={`commune-name-desktop-${commune.id}`}>
                                  {commune.name}
                                </span>
                                {commune.alias && (
                                  <span className="text-xs text-muted-foreground ml-2 italic" data-testid={`commune-alias-desktop-${commune.id}`}>
                                    ({commune.alias})
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {commune.postalCode ? (
                              <Badge
                                variant="outline"
                                className="border-kara-primary-dark/30 text-kara-primary-dark bg-kara-primary-dark/5"
                                data-testid={`commune-postal-code-desktop-${commune.id}`}
                              >
                                {commune.postalCode}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-700" data-testid={`commune-department-desktop-${commune.id}`}>
                              {department?.name || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Route className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                              <span className="text-sm text-muted-foreground" data-testid={`commune-district-count-desktop-${commune.id}`}>
                                {districtCount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(commune)}
                                className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-edit-commune-desktop-${commune.id}`}
                                aria-label={`Modifier ${commune.name}`}
                              >
                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCommuneToDelete(commune)
                                  setIsDeleteOpen(true)
                                }}
                                className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                data-testid={`btn-delete-commune-desktop-${commune.id}`}
                                aria-label={`Supprimer ${commune.name}`}
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
                  label="Charger plus de communes"
                />
              ) : communes.length > 0 ? (
                <div className="flex justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Tous les {totalCount ?? communes.length} commune(s) sont affichés
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div
              className="text-center py-12 text-muted-foreground bg-kara-primary-dark/5 rounded-lg"
              data-testid="commune-list-empty"
            >
              <MapPinned className="w-12 h-12 mx-auto mb-3 text-kara-primary-dark/30" aria-hidden="true" />
              <p>Aucune commune trouvée</p>
              <Button variant="link" onClick={openCreate} className="mt-2 text-kara-primary-dark">
                Créer une commune
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-commune-form">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark" data-testid="modal-commune-title">
              {editingCommune ? 'Modifier la commune' : 'Nouvelle commune'}
            </DialogTitle>
            <DialogDescription>
              {editingCommune
                ? 'Modifiez les informations de la commune'
                : 'Renseignez les informations de la nouvelle commune'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitCommune)} className="space-y-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Département</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger 
                          className="border-kara-primary-dark/20 focus:ring-kara-primary-dark/30"
                          data-testid="select-commune-department"
                        >
                          <SelectValue placeholder="Sélectionner un département" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
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
                    <FormLabel>Nom de la commune</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Libreville"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-commune-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code postal (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ex: 00000"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-commune-postal-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alias (optionnel, ex: "Ville")</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ex: Ville"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-commune-alias"
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
                  data-testid="btn-cancel-commune"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                  data-testid="btn-submit-commune"
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {editingCommune ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-commune-delete">
          <DialogHeader>
            <DialogTitle className="text-kara-error">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la commune <strong>"{communeToDelete?.name}"</strong> ?
              <br />
              <span className="text-kara-error font-medium mt-2 block">
                ⚠️ Cette action supprimera également tous les arrondissements et quartiers associés.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="btn-cancel-delete-commune"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
              data-testid="btn-confirm-delete-commune"
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
