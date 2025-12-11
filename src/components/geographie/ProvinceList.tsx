"use client"
import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { provinceSchema, type ProvinceFormData } from '@/schemas/geographie.schema'
import { useProvinces, useProvinceMutations } from '@/hooks/useGeographie'
import { toast } from 'sonner'
import { Plus, Search, Edit3, Trash2, MapPin, RefreshCw, Loader2, Download } from 'lucide-react'
import type { Province } from '@/types/types'

function ProvinceSkeleton() {
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

export default function ProvinceList() {
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [provinceToDelete, setProvinceToDelete] = useState<Province | null>(null)
  const [editingProvince, setEditingProvince] = useState<Province | null>(null)

  const { data: provinces = [], isLoading, error, refetch } = useProvinces()
  const { create, update, remove } = useProvinceMutations()

  const form = useForm<ProvinceFormData>({
    resolver: zodResolver(provinceSchema),
    defaultValues: { code: '', name: '' },
  })

  const filteredProvinces = useMemo(() => {
    if (!search.trim()) return provinces
    const searchLower = search.toLowerCase()
    return provinces.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
    )
  }, [provinces, search])

  const openCreate = () => {
    setEditingProvince(null)
    form.reset({ code: '', name: '' })
    setIsCreateOpen(true)
  }

  const openEdit = (province: Province) => {
    setEditingProvince(province)
    form.reset({
      code: province.code,
      name: province.name,
    })
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
      await refetch()
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const confirmDelete = async () => {
    if (!provinceToDelete) return
    try {
      await remove.mutateAsync(provinceToDelete.id)
      setIsDeleteOpen(false)
      setProvinceToDelete(null)
      await refetch()
    } catch (e: any) {
      // L'erreur est déjà gérée dans le hook avec toast
    }
  }

  const exportCsv = () => {
    const headers = ['Province', 'Code']
    const rows = filteredProvinces.map((province) => [province.name, province.code])
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Provinces</h2>
          <p className="text-gray-600 mt-1">{filteredProvinces.length} province(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filteredProvinces.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={openCreate} className="bg-[#234D65] hover:bg-[#234D65]/90 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Province
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou code..."
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>
            Une erreur est survenue lors du chargement des provinces
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProvinceSkeleton key={i} />
          ))}
        </div>
      ) : filteredProvinces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProvinces.map((province) => (
            <Card key={province.id} className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{province.name}</div>
                      <div className="text-sm text-gray-500">{province.code}</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(province)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProvinceToDelete(province)
                      setIsDeleteOpen(true)
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            Aucune province trouvée
          </CardContent>
        </Card>
      )}

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProvince ? 'Modifier une province' : 'Nouvelle province'}
            </DialogTitle>
            <DialogDescription>Renseignez les informations de la province</DialogDescription>
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
                      <Input {...field} placeholder="ESTUAIRE" />
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
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Estuaire" />
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
              Supprimer définitivement "{provinceToDelete?.name}" ?
              <br />
              <span className="text-red-600 font-medium">
                Cette action supprimera également tous les départements associés.
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

