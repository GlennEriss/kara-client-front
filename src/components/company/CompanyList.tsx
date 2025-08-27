"use client"
import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { companyCrudSchema, type CompanyCrudFormData } from '@/types/schemas'
import { useCompaniesPaginated, useCompanyMutations } from '@/hooks/useCompaniesQuery'
import { toast } from 'sonner'
import { Plus, Search, Edit3, Trash2, Building2, RefreshCw, MapPinIcon, CheckCircle, Loader2, Home } from 'lucide-react'

function CompanySkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-3 w-1/3 bg-gray-100 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function CompanyList() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<{ id: string; name: string } | null>(null)
  const [editingCompany, setEditingCompany] = useState<{ id: string; name: string; industry?: string; employeeCount?: number; address?: { province?: string; city?: string; district?: string } } | null>(null)

  // États pour la géolocalisation
  const [districtQuery, setDistrictQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<any>(null)

  const filters = useMemo(() => ({ search: search.trim() || undefined }), [search])
  const { data, isLoading, error, refetch } = useCompaniesPaginated(filters, page, limit)
  const { create, update, remove } = useCompanyMutations()

  const form = useForm({ resolver: zodResolver(companyCrudSchema), defaultValues: { name: '', industry: '', address: { province: '', city: '', district: '' } } })

  const openCreate = () => {
    setEditingCompany(null)
    form.reset({ name: '', industry: '', address: { province: '', city: '', district: '' } })
    // Réinitialiser les états de géolocalisation
    setDistrictQuery('')
    setSearchResults([])
    setSelectedLocation(null)
    setShowResults(false)
    setIsCreateOpen(true)
  }

  const openEdit = (c: { id: string; name: string; industry?: string; employeeCount?: number; address?: { province?: string; city?: string; district?: string } }) => {
    setEditingCompany(c)
    form.reset({ name: c.name, industry: c.industry || '', address: { province: c.address?.province || '', city: c.address?.city || '', district: c.address?.district || '' } })
    // Réinitialiser et remplir les états de géolocalisation
    setDistrictQuery(c.address?.district || '')
    setSearchResults([])
    setSelectedLocation(null)
    setShowResults(false)
    setIsCreateOpen(true)
  }

  const submitCompany = async (values: CompanyCrudFormData) => {
    try {
      if (editingCompany) {
        await update.mutateAsync({ id: editingCompany.id, updates: values })
        toast.success('Entreprise mise à jour')
      } else {
        await create.mutateAsync({ name: values.name, adminId: 'admin' as any, address: values.address, industry: values.industry })
        toast.success('Entreprise créée')
      }
      setIsCreateOpen(false)
      await refetch()
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement de l'entreprise")
    }
  }

  // Fonction pour rechercher avec Photon API
  const searchWithPhoton = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Bounding box du Gabon: [ouest, sud, est, nord]
      const gabonBbox = '8.5,-4.0,14.8,2.3'
      
      const response = await fetch(
        `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${gabonBbox}&limit=8&lang=fr`
      )
      
      if (response.ok) {
        const data = await response.json()
        // Filtrer pour ne garder que les résultats du Gabon
        const gabonResults = data.features.filter((result: any) => 
          result.properties.country === 'Gabon' || result.properties.country === 'GA'
        )
        setSearchResults(gabonResults)
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Photon:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Fonction pour sélectionner un résultat
  const handleLocationSelect = (result: any) => {
    const { properties } = result
    
    setSelectedLocation(result)
    setDistrictQuery(properties.name)
    setShowResults(false)

    // Remplir automatiquement les champs disponibles
    form.setValue('address.district', properties.name)
    form.setValue('address.city', properties.city || properties.suburb || '')
    form.setValue('address.province', properties.state || '')
  }

  // Fonction pour formater l'affichage des résultats
  const formatResultDisplay = (result: any) => {
    const { properties } = result
    const parts = [
      properties.name,
      properties.city || properties.suburb,
      properties.state
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  // Effet pour déclencher la recherche
  useEffect(() => {
    if (districtQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchWithPhoton(districtQuery)
        setShowResults(true)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }, [districtQuery])

  const confirmDelete = async () => {
    if (!companyToDelete) return
    try {
      await remove.mutateAsync(companyToDelete.id)
      toast.success('Entreprise supprimée')
      setIsDeleteOpen(false)
      setCompanyToDelete(null)
      await refetch()
    } catch (e) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const stats = useMemo(() => {
    const total = data?.pagination.totalItems ?? 0
    return { total }
  }, [data])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">Gestion des Entreprises</h1>
          <p className="text-gray-600 mt-1">{stats.total.toLocaleString()} entreprises au total</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-9">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
          <Button size="sm" onClick={openCreate} className="h-9 bg-[#234D65] hover:bg-[#234D65]/90 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nouvelle Entreprise
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-center">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Rechercher par nom..." className="pl-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {error ? (
        (() => { console.error('Erreur chargement entreprises:', error); return (
          <Alert variant="destructive">
            <AlertDescription>
              Une erreur est survenue lors du chargement des entreprises
            </AlertDescription>
          </Alert>
        ) })()
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => (<CompanySkeleton key={i} />))}
        </div>
      ) : (data && data.data.length > 0) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.data.map((c) => (
            <Card key={c.id} className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center"><Building2 className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.industry && (<div className="text-xs text-gray-500">{c.industry}</div>)}
                    </div>
                  </div>
                </div>
                {c.address && (
                  <p className="text-xs text-gray-600">
                    {[c.address.province, c.address.city, c.address.district].filter(Boolean).join(' • ')}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit({ id: c.id, name: c.name, industry: c.industry, employeeCount: c.employeeCount, address: c.address })} className="h-8 w-8 p-0"><Edit3 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => { setCompanyToDelete({ id: c.id, name: c.name }); setIsDeleteOpen(true) }} className="h-8 w-8 p-0 text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            Aucune entreprise trouvée
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.pagination.totalItems > limit && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Page {data.pagination.currentPage} / {data.pagination.totalPages} • {data.pagination.totalItems} résultats</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!data.pagination.hasPrevPage} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</Button>
              <Button variant="outline" size="sm" disabled={!data.pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal création / édition */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Modifier une entreprise' : 'Nouvelle entreprise'}</DialogTitle>
            <DialogDescription>Renseignez les informations de l'entreprise</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitCompany)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nom de l'entreprise" />
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
                    <FormLabel>Secteur (optionnel)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Secteur d'activité" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Recherche de quartier avec géolocalisation automatique */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="address.district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <span>Rechercher le quartier</span>
                        <Badge variant="secondary" className="bg-[#CBB171]/10 text-[#CBB171] text-[10px]">
                          Géolocalisation
                        </Badge>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] z-10" />
                          <Input
                            {...field}
                            placeholder="Ex: Glass, Akanda, Lalala..."
                            value={districtQuery}
                            onChange={(e) => {
                              field.onChange(e.target.value)
                              setDistrictQuery(e.target.value)
                            }}
                            className="pl-10 pr-12 border-[#CBB171]/30 focus:border-[#224D62] focus:ring-[#224D62]/20 transition-all duration-300"
                          />
                          
                          {/* Loading spinner */}
                          {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-spin z-10" />
                          )}
                          
                          {/* Success checkmark */}
                          {selectedLocation && !isSearching && (
                            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#CBB171] animate-in zoom-in-50 duration-200 z-10" />
                          )}

                          {/* Résultats de recherche */}
                          {showResults && searchResults.length > 0 && (
                            <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full max-h-64 overflow-y-auto">
                              <CardContent className="p-2">
                                <div className="space-y-1">
                                  {searchResults.map((result, index) => (
                                    <Button
                                      key={index}
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="w-full justify-start text-left hover:bg-[#224D62]/5 transition-colors text-xs sm:text-sm p-3"
                                      onClick={() => handleLocationSelect(result)}
                                    >
                                      <div className="flex items-start space-x-2 w-full">
                                        <MapPinIcon className="w-4 h-4 text-[#CBB171] mt-0.5 flex-shrink-0" />
                                        <div className="text-left">
                                          <div className="font-medium text-[#224D62]">
                                            {result.properties.name}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {formatResultDisplay(result)}
                                          </div>
                                        </div>
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Aucun résultat */}
                          {showResults && searchResults.length === 0 && !isSearching && districtQuery.length > 2 && (
                            <Card className="absolute top-full left-0 right-0 mt-1 z-20 border border-[#CBB171]/30 shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-200 w-full">
                              <CardContent className="p-4 text-center">
                                <div className="text-xs text-gray-500">
                                  Aucun résultat trouvé pour "{districtQuery}"
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Informations automatiques après sélection */}
                {selectedLocation && (
                  <div className="p-4 bg-[#CBB171]/5 rounded-lg border border-[#CBB171]/20 animate-in fade-in-0 slide-in-from-top-4 duration-500">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-[#CBB171]" />
                      <span className="text-sm font-medium text-[#224D62]">
                        Localisation détectée
                      </span>
                    </div>
                    <div className="text-xs text-[#224D62]/80">
                      {formatResultDisplay(selectedLocation)}
                    </div>
                  </div>
                )}

                {/* Champs automatiques remplis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <span>Ville</span>
                          <Badge variant="secondary" className="bg-[#224D62]/10 text-[#224D62] text-[10px]">
                            Automatique
                          </Badge>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              {...field}
                              disabled
                              placeholder="Sélectionnez d'abord un quartier"
                              className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <span>Province</span>
                          <Badge variant="secondary" className="bg-[#224D62]/10 text-[#224D62] text-[10px]">
                            Automatique
                          </Badge>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              {...field}
                              disabled
                              placeholder="Sélectionnez d'abord un quartier"
                              className="pl-10 bg-gray-50 text-gray-600 border-gray-200 cursor-not-allowed"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
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
            <DialogDescription>Supprimer définitivement "{companyToDelete?.name}" ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

