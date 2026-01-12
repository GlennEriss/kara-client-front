"use client"
import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { provinceSchema, type ProvinceFormData } from '../../schemas/geographie.schema'
import { useProvincesV2, useProvinceMutationsV2, useDepartmentsV2 } from '../../hooks/useGeographieV2'
import { LoadMoreButton } from '@/components/ui/load-more-button'
import { Plus, Search, Edit3, Trash2, MapPin, Loader2, Download, Building2, MoreVertical } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Province } from '../../entities/geography.types'

/**
 * ProvinceListV2 - Version 2 avec design compact et couleurs KARA
 * 
 * Améliorations :
 * - Design table/liste compact au lieu de cards énormes
 * - Couleurs KARA (kara-primary-dark, kara-primary-light)
 * - Informations supplémentaires (nombre de départements)
 * - Sélecteurs stables avec data-testid
 */

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

export default function ProvinceListV2() {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [provinceToDelete, setProvinceToDelete] = useState<Province | null>(null)
  const [editingProvince, setEditingProvince] = useState<Province | null>(null)

  // Hook V2 avec pagination et recherche côté serveur
  const { 
    data: provinces, 
    isLoading, 
    error, 
    hasNextPage, 
    fetchNextPage, 
    isFetchingNextPage,
    totalCount 
  } = useProvincesV2({ 
    search, 
    pageSize: 5 // Réduire pour tester la pagination avec les données de test
  })

  const { create, update, remove } = useProvinceMutationsV2()

  const form = useForm<ProvinceFormData>({
    resolver: zodResolver(provinceSchema),
    defaultValues: { code: '', name: '' },
  })

  // Comptage optimisé : utiliser getCount pour chaque province au lieu de charger toutes les données
  // On charge seulement les comptages pour les provinces affichées
  const departmentCountByProvince = useMemo(() => {
    const counts: Record<string, number> = {}
    // Les comptages seront chargés à la demande via des requêtes séparées si nécessaire
    // Pour l'instant, on retourne un objet vide et on affichera "..." ou un loader
    // TODO: Implémenter un hook useDepartmentCountByProvince pour optimiser
    return counts
  }, [])

  const openCreate = () => {
    setEditingProvince(null)
    form.reset({ code: '', name: '' })
    setIsCreateOpen(true)
  }

  const openEdit = (province: Province) => {
    setEditingProvince(province)
    form.reset({ code: province.code, name: province.name })
    setIsCreateOpen(true)
  }

  const submitProvince = async (values: ProvinceFormData) => {
    try {
      if (editingProvince) {
        await update.mutateAsync({ id: editingProvince.id, data: values })
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
    if (!provinceToDelete) return
    try {
      await remove.mutateAsync(provinceToDelete.id)
      setIsDeleteOpen(false)
      setProvinceToDelete(null)
    } catch {
      // Erreur gérée dans le hook
    }
  }

  const exportCsv = () => {
    const headers = ['Code', 'Province', 'Départements']
    const rows = provinces.map((p) => [
      p.code,
      p.name,
      departmentCountByProvince[p.id] ?? '...',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'provinces.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4" data-testid="province-list-v2">
      {/* Header avec actions */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-primary-dark/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="province-list-title">
                  Provinces
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="province-list-count">
                  {totalCount !== undefined ? `${totalCount} province(s)` : `${provinces.length} province(s)`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={provinces.length === 0}
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
                data-testid="btn-new-province"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouvelle Province</span>
                <span className="sm:hidden">Ajouter</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Recherche */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-9 border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
              data-testid="input-search-province"
            />
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="province-list-error">
              <AlertDescription>Erreur lors du chargement des provinces</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : provinces.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="province-list-cards">
                {provinces.map((province) => {
                  const deptCount = departmentCountByProvince[province.id] ?? '...'
                  return (
                    <div
                      key={province.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`province-card-${province.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-primary-light/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`province-name-${province.id}`}>
                          {province.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded" data-testid={`province-code-${province.id}`}>
                            {province.code}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" aria-hidden="true" />
                            <span data-testid={`province-dept-count-${province.id}`}>{deptCount}</span>
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 shrink-0"
                            data-testid={`btn-menu-province-${province.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => openEdit(province)}
                            className="cursor-pointer"
                            data-testid={`btn-edit-province-${province.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProvinceToDelete(province)
                              setIsDeleteOpen(true)
                            }}
                            className="cursor-pointer text-kara-error focus:text-kara-error"
                            data-testid={`btn-delete-province-${province.id}`}
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
                <Table data-testid="province-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Province</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Code</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-center">Départements</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {provinces.map((province) => {
                      const deptCount = departmentCountByProvince[province.id] ?? '...'
                      return (
                        <TableRow
                          key={province.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`province-row-${province.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-primary-light/20 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-kara-primary-dark" aria-hidden="true" />
                              </div>
                              <span className="font-medium text-gray-900" data-testid={`province-name-desktop-${province.id}`}>
                                {province.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-kara-primary-dark/30 text-kara-primary-dark bg-kara-primary-dark/5"
                              data-testid={`province-code-desktop-${province.id}`}
                            >
                              {province.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                              <span className="text-sm text-muted-foreground" data-testid={`province-dept-count-desktop-${province.id}`}>
                                {deptCount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(province)}
                                className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-edit-province-desktop-${province.id}`}
                                aria-label={`Modifier ${province.name}`}
                              >
                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setProvinceToDelete(province)
                                  setIsDeleteOpen(true)
                                }}
                                className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                data-testid={`btn-delete-province-desktop-${province.id}`}
                                aria-label={`Supprimer ${province.name}`}
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
                  autoLoad={false} // Désactiver autoLoad pour que l'utilisateur voie le bouton
                  label="Charger plus de provinces"
                />
              ) : provinces.length > 0 ? (
                <div className="flex justify-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Tous les {totalCount ?? provinces.length} province(s) sont affichés
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div
              className="text-center py-12 text-muted-foreground bg-kara-primary-dark/5 rounded-lg"
              data-testid="province-list-empty"
            >
              <MapPin className="w-12 h-12 mx-auto mb-3 text-kara-primary-dark/30" aria-hidden="true" />
              <p>Aucune province trouvée</p>
              <Button
                variant="link"
                onClick={openCreate}
                className="mt-2 text-kara-primary-dark"
              >
                Créer une province
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-province-form">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark" data-testid="modal-province-title">
              {editingProvince ? 'Modifier la province' : 'Nouvelle province'}
            </DialogTitle>
            <DialogDescription>
              {editingProvince
                ? 'Modifiez les informations de la province'
                : 'Renseignez les informations de la nouvelle province'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitProvince)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: G1"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-province-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la province</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ex: Estuaire"
                        className="border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
                        data-testid="input-province-name"
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
                  data-testid="btn-cancel-province"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={create.isPending || update.isPending}
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90 text-white"
                  data-testid="btn-submit-province"
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {editingProvince ? 'Modifier' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md" data-testid="modal-province-delete">
          <DialogHeader>
            <DialogTitle className="text-kara-error">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer la province <strong>"{provinceToDelete?.name}"</strong> ?
              <br />
              <span className="text-kara-error font-medium mt-2 block">
                ⚠️ Cette action supprimera également tous les départements, communes, arrondissements et quartiers associés.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              data-testid="btn-cancel-delete-province"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={remove.isPending}
              data-testid="btn-confirm-delete-province"
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
