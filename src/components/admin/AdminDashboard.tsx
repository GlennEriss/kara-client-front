"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Shield, UserPlus, Search, RefreshCw, Edit3, Trash2, CheckCircle2 } from 'lucide-react'
import MembershipPagination from '@/components/memberships/MembershipPagination'
import { useAdmins, useAdminMutations } from '@/hooks/useAdmins'
import { ADMIN_ROLE_LABELS, AdminRole, AdminUser } from '@/db/admin.db'
import AdminFormModal from '@/components/admin/AdminFormModal'
import { AdminCreateFormData } from '@/types/schemas'

type ViewMode = 'grid' | 'list'

interface AdminFiltersUI {
  roles?: AdminRole[]
  isActive?: boolean
  searchQuery?: string
}

function RoleBadge({ role }: { role: AdminRole }) {
  const colorMap: Record<AdminRole, string> = {
    SuperAdmin: 'bg-purple-100 text-purple-700',
    Admin: 'bg-blue-100 text-blue-700',
    Secretary: 'bg-amber-100 text-amber-700',
  }
  return <Badge className={`${colorMap[role]} font-semibold`}>{ADMIN_ROLE_LABELS[role]}</Badge>
}

function AdminSkeleton() {
  return (
    <Card className="group animate-pulse bg-gradient-to-br from-white to-gray-50/50 border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
            <Skeleton className="h-3 w-1/2 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
          <Skeleton className="h-3 w-3/4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [filters, setFilters] = useState<AdminFiltersUI>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data, isLoading, error, refetch } = useAdmins(
    {
      roles: filters.roles,
      isActive: filters.isActive,
      searchQuery: filters.searchQuery,
      orderByField: 'createdAt',
      orderByDirection: 'desc',
    },
    currentPage,
    itemsPerPage
  )

  const { createMutation, updateMutation, deleteMutation } = useAdminMutations()

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const admins: AdminUser[] = data?.data || []

  const stats = useMemo(() => {
    const total = admins.length
    const byRole: Record<AdminRole, number> = {
      SuperAdmin: 0,
      Admin: 0,
      Secretary: 0,
    }
    let active = 0
    admins.forEach((a) => {
      if (a.isActive) active += 1
      for (const r of a.roles || []) {
        if (r in byRole) byRole[r as AdminRole] += 1
      }
    })
    return { total, active, byRole }
  }, [admins])

  const handleRefresh = async () => {
    await refetch()
    toast.success('✅ Données actualisées')
  }

  const handleCreateOpen = () => setIsCreateOpen(true)
  const handleCreateSubmit = async (values: AdminCreateFormData) => {
    try {
      await createMutation.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        civility: values.civility,
        gender: values.gender,
        email: values.email,
        contacts: values.contacts,
        roles: values.roles as AdminRole[],
        photoURL: values.photoURL ?? null,
        photoPath: values.photoPath ?? null,
        isActive: true,
      })
      toast.success('Administrateur créé')
    } catch (e) {
      toast.error("Erreur lors de la création de l'administrateur")
    }
  }

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      await updateMutation.mutateAsync({ id: admin.id, updates: { isActive: !admin.isActive } })
      toast.success('Statut mis à jour')
    } catch (e) {
      toast.error('Erreur de mise à jour')
    }
  }

  const handleDelete = async (admin: AdminUser) => {
    try {
      // Supprimer côté Auth (uid = matricule/id)
      await fetch('/api/firebase/auth/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: admin.id }),
      })
      // Supprimer dans notre collection admins/users listés
      await deleteMutation.mutateAsync(admin.id)
      toast.success('Administrateur supprimé')
    } catch (e) {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleApplySearch = () => {
    setFilters((prev) => ({ ...prev, searchQuery: search.trim() || undefined }))
  }

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-gray-100">
                  <Users className="w-6 h-6 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Total Admins</p>
                  <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-green-100">
                  <CheckCircle2 className="w-6 h-6 text-green-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Actifs</p>
                  <p className="text-3xl font-black text-gray-900">{stats.active}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-2">
              <RoleBadge role="SuperAdmin" />
              <span className="font-bold text-gray-700">{stats.byRole.SuperAdmin}</span>
            </div>
            <div className="flex items-center space-x-3 mb-2">
              <RoleBadge role="Admin" />
              <span className="font-bold text-gray-700">{stats.byRole.Admin}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-2">
              <RoleBadge role="Secretary" />
              <span className="font-bold text-gray-700">{stats.byRole.Secretary}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'actions / filtres */}
      <Card className="bg-gradient-to-r from-white via-gray-50/50 to-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  Gestion des Administrateurs
                </h2>
                {data && (
                  <p className="text-gray-600 font-medium">
                    {data.pagination.totalItems.toLocaleString()} administrateurs • Page {currentPage}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 min-w-[200px] flex items-center gap-2">
                <Input
                  placeholder="Rechercher (nom, email)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                />
                <Button variant="outline" onClick={handleApplySearch} className="border-[#234D65]">
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher
                </Button>
              </div>

              <Select
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    roles: val === 'all' ? undefined : ([val] as AdminRole[]),
                  }))
                }
              >
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="SuperAdmin">{ADMIN_ROLE_LABELS.SuperAdmin}</SelectItem>
                  <SelectItem value="Admin">{ADMIN_ROLE_LABELS.Admin}</SelectItem>
                  <SelectItem value="Secretary">{ADMIN_ROLE_LABELS.Secretary}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(val) =>
                  setFilters((prev) => ({ ...prev, isActive: val === 'all' ? undefined : val === 'active' }))
                }
              >
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-10 px-4 bg-white border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>

              <Button
                size="sm"
                onClick={handleCreateOpen}
                className="h-10 px-4 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nouvel Admin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {error ? (
        <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
          <AlertDescription className="text-red-700 font-medium">
            Une erreur est survenue lors du chargement des administrateurs.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6' : 'space-y-6'}>
          {[...Array(itemsPerPage)].map((_, i) => (
            <AdminSkeleton key={i} />
          ))}
        </div>
      ) : admins.length > 0 ? (
        <>
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6' : 'space-y-6'}>
            {admins.map((admin) => (
              <Card key={admin.id} className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold text-gray-900">
                        {admin.firstName} {admin.lastName}
                      </div>
                      <div className="text-sm text-gray-600">{admin.email}</div>
                    </div>
                    {admin.roles && admin.roles.length > 0 && (
                      <RoleBadge role={admin.roles[0]} />
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge variant={admin.isActive ? 'default' : 'secondary'} className={admin.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {admin.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(admin)}>
                        <Edit3 className="w-4 h-4 mr-1" />
                        {admin.isActive ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(admin)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && data.pagination.totalItems > itemsPerPage && (
            <Card className="bg-gradient-to-r from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4">
                <MembershipPagination
                  pagination={data.pagination}
                  onPageChange={(p) => {
                    setCurrentPage(p)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  onItemsPerPageChange={(n) => {
                    setItemsPerPage(n)
                    setCurrentPage(1)
                  }}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-white via-gray-50/50 to-white border-0 shadow-2xl">
          <CardContent className="text-center p-16">
            <div className="space-y-6">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <Shield className="h-10 w-10 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucun administrateur</h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto leading-relaxed">
                  Commencez par ajouter votre premier administrateur.
                </p>
              </div>
              <div className="flex justify-center">
                <Button onClick={handleCreateOpen} className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un admin
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AdminFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />
    </div>
  )
}

 
