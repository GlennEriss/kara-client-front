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
import { companyCrudSchema, type CompanyCrudFormData } from '@/schemas/schemas'
import { useCompaniesPaginated, useCompanyMutations } from '../hooks/useCompanies'
import { toast } from 'sonner'
import { 
  Plus, Search, Edit3, Trash2, Building2, Download, MoreVertical, 
  MapPin, ChevronLeft, ChevronRight, Loader2 
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Company } from '../entities/company.types'

/**
 * CompanyListV2 - Version 2 avec design cohérent KARA
 * 
 * Améliorations :
 * - Design table/liste compact au lieu de cards énormes
 * - Couleurs KARA (kara-primary-dark, kara-primary-light)
 * - Stats cards en haut
 * - Vue responsive (liste mobile / table desktop)
 * - Sélecteurs stables avec data-testid
 */

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}


export default function CompanyListV2() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  const limit = 10

  const filters = useMemo(() => ({ search: search.trim() || undefined }), [search])
  const { data, isLoading, error, refetch } = useCompaniesPaginated(filters, page, limit)
  const { create, update, remove } = useCompanyMutations()

  const form = useForm<CompanyCrudFormData>({
    resolver: zodResolver(companyCrudSchema),
    defaultValues: { name: '', industry: '', address: { province: '', city: '', district: '' } },
  })

  const companies = data?.data || []
  const pagination = data?.pagination
  const totalCount = pagination?.totalItems || 0

  const openCreate = () => {
    setEditingCompany(null)
    form.reset({ name: '', industry: '', address: { province: '', city: '', district: '' } })
    setIsCreateOpen(true)
  }

  const openEdit = (company: Company) => {
    setEditingCompany(company)
    form.reset({ 
      name: company.name, 
      industry: company.industry || '', 
      address: { 
        province: company.address?.province || '', 
        city: company.address?.city || '', 
        district: company.address?.district || '' 
      } 
    })
    setIsCreateOpen(true)
  }

  const submitCompany = async (values: CompanyCrudFormData) => {
    try {
      if (editingCompany) {
        await update.mutateAsync({ id: editingCompany.id, updates: values })
        toast.success('Entreprise mise à jour avec succès')
      } else {
        await create.mutateAsync({ 
          name: values.name, 
          adminId: 'admin',
          address: values.address, 
          industry: values.industry 
        })
        toast.success('Entreprise créée avec succès')
      }
      setIsCreateOpen(false)
      form.reset()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const confirmDelete = async () => {
    if (!companyToDelete) return
    try {
      await remove.mutateAsync(companyToDelete.id)
      toast.success('Entreprise supprimée')
      setIsDeleteOpen(false)
      setCompanyToDelete(null)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const exportCsv = () => {
    const headers = ['Nom', 'Secteur', 'Province', 'Ville', 'Quartier']
    const rows = companies.map((c) => [
      c.name,
      c.industry || '',
      c.address?.province || '',
      c.address?.city || '',
      c.address?.district || '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'entreprises.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const formatAddress = (company: Company) => {
    const parts = [company.address?.province, company.address?.city, company.address?.district].filter(Boolean)
    return parts.length > 0 ? parts.join(' • ') : null
  }

  return (
    <div className="space-y-4" data-testid="company-list-v2">
      {/* Liste principale */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-primary-dark/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="company-list-title">
                  Entreprises
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="company-list-count">
                  {totalCount} entreprise(s) enregistrée(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={companies.length === 0}
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
                data-testid="btn-new-company"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouvelle Entreprise</span>
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
              onChange={(e) => { setPage(1); setSearch(e.target.value) }}
              placeholder="Rechercher une entreprise..."
              className="pl-9 border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
              data-testid="input-search-company"
            />
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="company-list-error">
              <AlertDescription>Erreur lors du chargement des entreprises</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : companies.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="company-list-cards">
                {companies.map((company) => {
                  const address = formatAddress(company)
                  return (
                    <div
                      key={company.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                      data-testid={`company-card-${company.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-kara-primary-light/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" data-testid={`company-name-${company.id}`}>
                          {company.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {company.industry && (
                            <Badge variant="secondary" className="bg-kara-accent/10 text-kara-accent text-[10px]">
                              {company.industry}
                            </Badge>
                          )}
                          {address && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span className="truncate">{address}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 shrink-0"
                            data-testid={`btn-menu-company-${company.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => openEdit(company)}
                            className="cursor-pointer"
                            data-testid={`btn-edit-company-${company.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCompanyToDelete(company)
                              setIsDeleteOpen(true)
                            }}
                            className="cursor-pointer text-kara-error focus:text-kara-error"
                            data-testid={`btn-delete-company-${company.id}`}
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
                <Table data-testid="company-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Entreprise</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Secteur</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Adresse</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => {
                      const address = formatAddress(company)
                      return (
                        <TableRow
                          key={company.id}
                          className="hover:bg-kara-primary-light/5 transition-colors"
                          data-testid={`company-row-${company.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-kara-primary-light/20 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-kara-primary-dark" aria-hidden="true" />
                              </div>
                              <span className="font-medium text-gray-900" data-testid={`company-name-desktop-${company.id}`}>
                                {company.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {company.industry ? (
                              <Badge
                                variant="outline"
                                className="border-kara-accent/30 text-kara-accent bg-kara-accent/5"
                                data-testid={`company-industry-${company.id}`}
                              >
                                {company.industry}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {address ? (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-xs truncate">
                                <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span className="truncate" data-testid={`company-address-${company.id}`}>
                                  {address}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(company)}
                                className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                                data-testid={`btn-edit-company-desktop-${company.id}`}
                                aria-label={`Modifier ${company.name}`}
                              >
                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCompanyToDelete(company)
                                  setIsDeleteOpen(true)
                                }}
                                className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                                data-testid={`btn-delete-company-desktop-${company.id}`}
                                aria-label={`Supprimer ${company.name}`}
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
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} sur {pagination.totalPages} • {pagination.totalItems} résultat(s)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage}
                      className="h-8"
                      data-testid="btn-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Précédent</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!pagination.hasNextPage}
                      className="h-8"
                      data-testid="btn-next-page"
                    >
                      <span className="hidden sm:inline">Suivant</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground" data-testid="company-list-empty">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Aucune entreprise trouvée</p>
              {search && (
                <p className="text-sm mt-1">Essayez de modifier votre recherche</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-kara-primary-dark">
              {editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany 
                ? 'Modifiez les informations de l\'entreprise' 
                : 'Renseignez les informations de la nouvelle entreprise'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitCompany)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'entreprise</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Total Gabon" 
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secteur d'activité (optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Pétrole, Banque, Santé..." 
                        data-testid="input-company-industry"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ex: Estuaire" 
                          data-testid="input-company-province"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ville</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Ex: Libreville" 
                          data-testid="input-company-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address.district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quartier (optionnel)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Glass, Akanda..." 
                        data-testid="input-company-district"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="btn-cancel"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  className="bg-kara-primary-dark hover:bg-kara-primary-dark/90"
                  disabled={create.isPending || update.isPending}
                  data-testid="btn-submit"
                >
                  {(create.isPending || update.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingCompany ? 'Mettre à jour' : 'Créer'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-kara-error">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'entreprise "{companyToDelete?.name}" ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)}
              data-testid="btn-cancel-delete"
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={remove.isPending}
              data-testid="btn-confirm-delete"
            >
              {remove.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
