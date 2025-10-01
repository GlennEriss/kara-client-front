"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Shield, UserPlus, Search, RefreshCw, Edit3, Trash2, CheckCircle2, Phone, Mail, CalendarClock, MoreVertical, Eye, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import MembershipPagination from '@/components/memberships/MembershipPagination'
import { useAdmins, useAdminMutations } from '@/hooks/useAdmins'
import { updateAdminDeep } from '@/db/admin.db'
import { ADMIN_ROLE_LABELS, AdminRole, AdminUser } from '@/db/admin.db'
import AdminFormModal from '@/components/admin/AdminFormModal'
import { AdminCreateFormData } from '@/schemas/schemas'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'

type ViewMode = 'grid' | 'list'

interface AdminFiltersUI {
  roles?: AdminRole[]
  isActive?: boolean
  searchQuery?: string
}

function RoleBadge({ role }: { role: AdminRole }) {
  const variants: Record<AdminRole, { bg: string; text: string; dot: string }> = {
    SuperAdmin: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    Admin: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    Secretary: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  }
  const variant = variants[role]

  return (
    <Badge variant="outline" className={`${variant.bg} ${variant.text} border-0 font-medium`}>
      <div className={`w-2 h-2 rounded-full ${variant.dot} mr-1.5`} />
      {ADMIN_ROLE_LABELS[role]}
    </Badge>
  )
}

function AdminSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-6 w-12" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const COLORS = {
  SuperAdmin: '#8b5cf6',
  Admin: '#3b82f6',
  Secretary: '#f59e0b',
  active: '#10b981',
  inactive: '#ef4444'
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<AdminFiltersUI>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [adminToEdit, setAdminToEdit] = useState<AdminUser | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

    // Data pour les graphiques
    const roleData = Object.entries(byRole).map(([role, count]) => ({
      name: ADMIN_ROLE_LABELS[role as AdminRole],
      value: count,
      color: COLORS[role as AdminRole]
    })).filter(item => item.value > 0)

    const statusData = [
      { name: 'Actifs', value: active, color: COLORS.active },
      { name: 'Inactifs', value: total - active, color: COLORS.inactive }
    ].filter(item => item.value > 0)

    return { total, active, byRole, roleData, statusData }
  }, [admins])

  const handleRefresh = async () => {
    await refetch()
    toast.success('✅ Données actualisées')
  }

  const handleCreateOpen = () => setIsCreateOpen(true)
  const handleCreateSubmit = async (values: AdminCreateFormData) => {
    try {
      // La création est gérée intégralement dans AdminFormModal (Auth + Firestore).
      // Ici, on force juste un rafraîchissement pour mettre la liste à jour.
      await refetch()
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

  const handleOpenEdit = (admin: AdminUser) => {
    setAdminToEdit(admin)
    setIsEditOpen(true)
  }

  const handleSubmitEdit = async (values: any) => {
    if (!adminToEdit) return
    try {
      const updates: Partial<AdminUser> = {
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate,
        civility: values.civility as any,
        gender: values.gender as any,
        email: values.email?.trim() ? values.email.trim() : undefined,
        contacts: values.contacts,
        roles: values.roles as any,
        photoURL: values.photoURL ?? null,
        photoPath: values.photoPath ?? null,
        updatedBy: user?.uid || 'SuperAdmin'
      }
      await updateAdminDeep(adminToEdit.id, {
        ...updates,
        updateAuth: {
          displayName: `${values.firstName} ${values.lastName}`.trim(),
          photoURL: values.photoURL ?? undefined,
          phoneNumber: values.contacts?.[0],
        },
      })
      toast.success('Administrateur mis à jour')
    } catch (e) {
      toast.error("Erreur lors de la mise à jour de l'administrateur")
    } finally {
      setIsEditOpen(false)
      setAdminToEdit(null)
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

  const openDeleteConfirm = (admin: AdminUser) => {
    setAdminToDelete(admin)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!adminToDelete) return
    try {
      setIsDeleting(true)
      await handleDelete(adminToDelete)
      setIsDeleteOpen(false)
      setAdminToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleApplySearch = () => {
    setFilters((prev) => ({ ...prev, searchQuery: search.trim() || undefined }))
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-gray-600">{payload[0].value} administrateur(s)</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Gestion des Administrateurs
          </h1>
          <p className="text-gray-600 text-lg">
            {data?.pagination.totalItems.toLocaleString() || 0} administrateurs au total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button size="sm" onClick={handleCreateOpen} className="h-9 bg-[#234D65] hover:bg-[#234D65]/90 text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Nouvel Admin
          </Button>
        </div>
      </div>

      {/* Stats avec graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats principales */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Administrateurs</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Administrateurs Actifs</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% du total
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique des rôles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Répartition par Rôles</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {stats.roleData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.roleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.roleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                Aucune donnée à afficher
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {stats.roleData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Graphique du statut */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Statut d'Activité</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {stats.statusData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                Aucune donnée à afficher
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {stats.statusData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplySearch()}
                className="max-w-sm"
              />
              <Button variant="outline" onClick={handleApplySearch} size="sm">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select
                onValueChange={(val) =>
                  setFilters((prev) => ({
                    ...prev,
                    roles: val === 'all' ? undefined : ([val] as AdminRole[]),
                  }))
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
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
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des administrateurs */}
      {error ? (
        (() => {
          console.error('Erreur chargement administrateurs:', error); return (
            <Alert variant="destructive">
              <AlertDescription>
                Une erreur est survenue lors du chargement des administrateurs
                {error instanceof Error ? `: ${error.message}` : ''}
              </AlertDescription>
            </Alert>
          )
        })()
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <AdminSkeleton key={i} />
          ))}
        </div>
      ) : admins.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {admins.map((admin) => (
              <Card key={admin.id} className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage
                          src={admin.photoURL ?? undefined}
                          alt={`${admin.firstName} ${admin.lastName}`}
                        />
                        <AvatarFallback className="bg-gray-100 text-gray-600 font-medium text-sm">
                          {`${admin.firstName?.[0] ?? ''}${admin.lastName?.[0] ?? ''}`.toUpperCase() || 'AD'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {admin.roles && admin.roles.length > 0 && (
                      <RoleBadge role={admin.roles[0]} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {admin.firstName} {admin.lastName}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      #{admin.id}
                    </p>
                    {admin.email && (
                      <div className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600 truncate">{admin.email}</span>
                      </div>
                    )}
                    {admin.contacts?.[0] && (
                      <div className="flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{admin.contacts[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={admin.isActive ? 'default' : 'secondary'}
                      className={`text-xs ${admin.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                    >
                      {admin.isActive ? 'Actif' : 'Inactif'}
                    </Badge>

                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(admin)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(admin)}
                        className="h-8 w-8 p-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteConfirm(admin)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {data && data.pagination.totalItems > itemsPerPage && (
            <Card>
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
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun administrateur trouvé
            </h3>
            <p className="text-gray-600 mb-6">
              Commencez par ajouter votre premier administrateur.
            </p>
            <Button onClick={handleCreateOpen} className="bg-[#234D65] hover:bg-[#234D65]/90 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un administrateur
            </Button>
          </CardContent>
        </Card>
      )}

      <AdminFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />
      {adminToEdit && (
        <AdminFormModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false)
            setAdminToEdit(null)
          }}
          onSubmit={handleSubmitEdit}
          mode="edit"
          initialValues={adminToEdit}
        />
      )}

      {/* Confirmation de suppression */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'administrateur
              {adminToDelete ? ` ${adminToDelete.firstName} ${adminToDelete.lastName} (#${adminToDelete.id})` : ''} ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Suppression...</span>
              ) : (
                'Supprimer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}