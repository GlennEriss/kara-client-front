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
import { communeSchema, type CommuneFormData } from '@/schemas/geographie.schema'
import { useCommunes, useCommuneMutations, useDepartments, useProvinces } from '@/hooks/useGeographie'
import { toast } from 'sonner'
import { Plus, Search, Edit3, Trash2, Building2, RefreshCw, Loader2, Download } from 'lucide-react'
import type { Commune } from '@/types/types'

function CommuneSkeleton() {
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

export default function CommuneList() {
  const [search, setSearch] = useState('')
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('all')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [communeToDelete, setCommuneToDelete] = useState<Commune | null>(null)
  const [editingCommune, setEditingCommune] = useState<Commune | null>(null)

  const { data: provinces = [] } = useProvinces()
  const { data: departments = [] } = useDepartments(selectedProvinceId === 'all' ? undefined : selectedProvinceId)
  const { data: communes = [], isLoading, error, refetch } = useCommunes(selectedDepartmentId === 'all' ? undefined : selectedDepartmentId)
  const { create, update, remove } = useCommuneMutations()

  const form = useForm<CommuneFormData>({
    resolver: zodResolver(communeSchema),
    defaultValues: { departmentId: '', name: '', postalCode: undefined, alias: undefined },
  })

  const filteredCommunes = useMemo(() => {
    let filtered = communes
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.postalCode?.toLowerCase().includes(searchLower) ||
          c.alias?.toLowerCase().includes(searchLower)
      )
    }
    return filtered
  }, [communes, search])

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
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const confirmDelete = async () => {
    if (!communeToDelete) return
    try {
      await remove.mutateAsync(communeToDelete.id)
      setIsDeleteOpen(false)
      setCommuneToDelete(null)
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const exportCsv = () => {
    const headers = ['Commune', 'Alias', 'Code postal', 'Département', 'Province']
    const rows = filteredCommunes.map((commune) => {
      const department = departments.find((d) => d.id === commune.departmentId)
      const province = department ? provinces.find((p) => p.id === department.provinceId) : null
      return [
        commune.name,
        commune.alias || '',
        commune.postalCode || '',
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
    link.download = 'communes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Communes</h2>
          <p className="text-gray-600 mt-1">{filteredCommunes.length} commune(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filteredCommunes.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-[#234D65] hover:bg-[#234D65]/90 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Commune
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
                placeholder="Rechercher par nom, code postal ou alias..."
                className="pl-9"
              />
            </div>
            <Select value={selectedProvinceId} onValueChange={(value) => {
              setSelectedProvinceId(value)
              setSelectedDepartmentId('all')
            }}>
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
            <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
              <SelectTrigger className="w-[200px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Une erreur est survenue lors du chargement des communes
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CommuneSkeleton key={i} />
          ))}
        </div>
      ) : filteredCommunes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunes.map((commune) => {
            const department = departments.find((d) => d.id === commune.departmentId)
            const province = provinces.find((p) => p.id === department?.provinceId)
            return (
              <Card key={commune.id} className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{commune.name}</div>
                        {commune.alias && (
                          <div className="text-xs text-gray-500 italic">({commune.alias})</div>
                        )}
                        <div className="text-sm text-gray-500">{department?.name}</div>
                        {province && (
                          <div className="text-xs text-gray-400">{province.name}</div>
                        )}
                        {commune.postalCode && (
                          <div className="text-xs text-gray-400">{commune.postalCode}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(commune)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCommuneToDelete(commune)
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
            Aucune commune trouvée
          </CardContent>
        </Card>
      )}

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCommune ? 'Modifier une commune' : 'Nouvelle commune'}</DialogTitle>
            <DialogDescription>Renseignez les informations de la commune</DialogDescription>
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
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un département" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
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
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Saisir le nom" />
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
                      <Input {...field} value={field.value ?? ''} placeholder="00000" />
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
                      <Input {...field} value={field.value ?? ''} placeholder="Ville" />
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
              Supprimer définitivement "{communeToDelete?.name}" ?
              <br />
              <span className="text-red-600 font-medium">
                Cette action supprimera également tous les arrondissements associés.
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

