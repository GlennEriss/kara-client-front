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
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jobSchema, type JobFormData } from '@/schemas/schemas'
import { useProfessionsPaginated, useProfessionMutations } from '../hooks/useProfessions'
import { toast } from 'sonner'
import { 
  Plus, Search, Edit3, Trash2, Briefcase, Download, MoreVertical, 
  ChevronLeft, ChevronRight, Loader2 
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Profession } from '../entities/profession.types'

/**
 * ProfessionListV2 - Version 2 avec design cohérent KARA
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
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}


export default function ProfessionListV2() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [professionToDelete, setProfessionToDelete] = useState<Profession | null>(null)
  const [editingProfession, setEditingProfession] = useState<Profession | null>(null)

  const limit = 10

  const filters = useMemo(() => ({ search: search.trim() || undefined }), [search])
  const { data, isLoading, error, refetch } = useProfessionsPaginated(filters, page, limit)
  const { create, update, remove } = useProfessionMutations()

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: { name: '', description: '' },
  })

  const professions = data?.data || []
  const pagination = data?.pagination
  const totalCount = pagination?.totalItems || 0

  const openCreate = () => {
    setEditingProfession(null)
    form.reset({ name: '', description: '' })
    setIsCreateOpen(true)
  }

  const openEdit = (profession: Profession) => {
    setEditingProfession(profession)
    form.reset({ 
      name: profession.name, 
      description: profession.description || '' 
    })
    setIsCreateOpen(true)
  }

  const submitProfession = async (values: JobFormData) => {
    try {
      if (editingProfession) {
        await update.mutateAsync({ id: editingProfession.id, updates: values })
        toast.success('Métier mis à jour avec succès')
      } else {
        await create.mutateAsync({ 
          name: values.name, 
          adminId: 'admin',
          description: values.description 
        })
        toast.success('Métier créé avec succès')
      }
      setIsCreateOpen(false)
      form.reset()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const confirmDelete = async () => {
    if (!professionToDelete) return
    try {
      await remove.mutateAsync(professionToDelete.id)
      toast.success('Métier supprimé')
      setIsDeleteOpen(false)
      setProfessionToDelete(null)
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const exportCsv = () => {
    const headers = ['Nom', 'Catégorie', 'Description']
    const rows = professions.map((p) => [
      p.name,
      p.category || '',
      p.description || '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'metiers.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4" data-testid="profession-list-v2">
      {/* Liste principale */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-kara-primary-dark/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-kara-primary-dark" data-testid="profession-list-title">
                  Métiers / Professions
                </CardTitle>
                <p className="text-sm text-muted-foreground" data-testid="profession-list-count">
                  {totalCount} métier(s) enregistré(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={professions.length === 0}
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
                data-testid="btn-new-profession"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Nouveau Métier</span>
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
              placeholder="Rechercher un métier..."
              className="pl-9 border-kara-primary-dark/20 focus-visible:ring-kara-primary-dark/30"
              data-testid="input-search-profession"
            />
          </div>

          {/* Contenu */}
          {error ? (
            <Alert variant="destructive" data-testid="profession-list-error">
              <AlertDescription>Erreur lors du chargement des métiers</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <TableSkeleton />
          ) : professions.length > 0 ? (
            <>
              {/* Vue Liste compacte - Mobile */}
              <div className="block sm:hidden divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden" data-testid="profession-list-cards">
                {professions.map((profession) => (
                  <div
                    key={profession.id}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors"
                    data-testid={`profession-card-${profession.id}`}
                  >
                    <div className="h-10 w-10 rounded-lg bg-kara-primary-light/20 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-kara-primary-dark" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate" data-testid={`profession-name-${profession.id}`}>
                        {profession.name}
                      </div>
                      {profession.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {profession.description}
                        </p>
                      )}
                      {profession.category && (
                        <Badge 
                          variant="secondary" 
                          className="bg-kara-accent/10 text-kara-accent text-[10px] mt-1"
                        >
                          {profession.category}
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 shrink-0"
                          data-testid={`btn-menu-profession-${profession.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem 
                          onClick={() => openEdit(profession)}
                          className="cursor-pointer"
                          data-testid={`btn-edit-profession-${profession.id}`}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setProfessionToDelete(profession)
                            setIsDeleteOpen(true)
                          }}
                          className="cursor-pointer text-kara-error focus:text-kara-error"
                          data-testid={`btn-delete-profession-${profession.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {/* Vue Table - Desktop/Tablette */}
              <div className="hidden sm:block rounded-lg border border-kara-primary-dark/10 overflow-hidden">
                <Table data-testid="profession-list-table">
                  <TableHeader>
                    <TableRow className="bg-kara-primary-dark/5 hover:bg-kara-primary-dark/5">
                      <TableHead className="text-kara-primary-dark font-semibold">Métier</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Catégorie</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold">Description</TableHead>
                      <TableHead className="text-kara-primary-dark font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professions.map((profession) => (
                      <TableRow
                        key={profession.id}
                        className="hover:bg-kara-primary-light/5 transition-colors"
                        data-testid={`profession-row-${profession.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-kara-primary-light/20 flex items-center justify-center">
                              <Briefcase className="w-4 h-4 text-kara-primary-dark" aria-hidden="true" />
                            </div>
                            <span className="font-medium text-gray-900" data-testid={`profession-name-desktop-${profession.id}`}>
                              {profession.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {profession.category ? (
                            <Badge
                              variant="outline"
                              className="border-kara-accent/30 text-kara-accent bg-kara-accent/5"
                              data-testid={`profession-category-${profession.id}`}
                            >
                              {profession.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {profession.description ? (
                            <p 
                              className="text-sm text-muted-foreground max-w-xs truncate"
                              title={profession.description}
                              data-testid={`profession-description-${profession.id}`}
                            >
                              {profession.description}
                            </p>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(profession)}
                              className="h-8 w-8 p-0 hover:bg-kara-primary-light/20 hover:text-kara-primary-dark"
                              data-testid={`btn-edit-profession-desktop-${profession.id}`}
                              aria-label={`Modifier ${profession.name}`}
                            >
                              <Edit3 className="w-4 h-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setProfessionToDelete(profession)
                                setIsDeleteOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-kara-error hover:text-kara-error hover:bg-kara-error/10"
                              data-testid={`btn-delete-profession-desktop-${profession.id}`}
                              aria-label={`Supprimer ${profession.name}`}
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
            <div className="text-center py-12 text-muted-foreground" data-testid="profession-list-empty">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Aucun métier trouvé</p>
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
              {editingProfession ? 'Modifier le métier' : 'Nouveau métier'}
            </DialogTitle>
            <DialogDescription>
              {editingProfession 
                ? 'Modifiez les informations du métier' 
                : 'Renseignez les informations du nouveau métier'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitProfession)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du métier</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Ingénieur, Médecin, Comptable..." 
                        data-testid="input-profession-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Décrivez brièvement ce métier..." 
                        className="resize-none"
                        rows={3}
                        data-testid="input-profession-description"
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
                  {editingProfession ? 'Mettre à jour' : 'Créer'}
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
              Êtes-vous sûr de vouloir supprimer le métier "{professionToDelete?.name}" ? 
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
