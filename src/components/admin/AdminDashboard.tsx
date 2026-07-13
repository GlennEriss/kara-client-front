"use client"
import AdminFormModal from '@/components/admin/AdminFormModal'
import MembershipPagination from '@/components/memberships/MembershipPagination'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PageHero } from '@/components/ui/page-hero'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useAuditLogger } from '@/hooks/useAuditLog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ADMIN_ROLE_LABELS, AdminRole, AdminUser, updateAdminDeep } from '@/db/admin.db'
import { useAdminMutations, useAdmins } from '@/hooks/useAdmins'
import { useAuth } from '@/hooks/useAuth'
import { AdminCreateFormData } from '@/schemas/schemas'
import { Ban, CheckCircle2, Edit3, Loader2, Mail, Phone, RefreshCw, Search, Shield, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
// recharts chargé à la demande (hors bundle initial du dashboard)
const DashboardPieChart = dynamic(() => import('./DashboardPieChart'), { ssr: false })
import { toast } from 'sonner'

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

  const { updateMutation, deleteMutation } = useAdminMutations()
  const { log } = useAuditLogger()

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
      log({
        action: 'create',
        module: 'admins',
        moduleLabel: 'Administration',
        targetType: 'administrateur',
        description: `Création de l'administrateur ${values.firstName} ${values.lastName}`.trim(),
      })
    } catch {
      toast.error("Erreur lors de la création de l'administrateur")
    }
  }

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      const nextActive = !admin.isActive
      await updateMutation.mutateAsync({ id: admin.id, updates: { isActive: nextActive } })
      toast.success('Statut mis à jour')
      log({
        action: 'update',
        module: 'admins',
        moduleLabel: 'Administration',
        targetType: 'administrateur',
        targetId: admin.id,
        description: `${nextActive ? 'Activation' : 'Désactivation'} de l'administrateur ${admin.firstName} ${admin.lastName}`,
      })
    } catch {
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
      log({
        action: 'update',
        module: 'admins',
        moduleLabel: 'Administration',
        targetType: 'administrateur',
        targetId: adminToEdit.id,
        description: `Modification de l'administrateur ${values.firstName} ${values.lastName}`.trim(),
      })
    } catch {
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
      log({
        action: 'delete',
        module: 'admins',
        moduleLabel: 'Administration',
        targetType: 'administrateur',
        targetId: admin.id,
        description: `Suppression de l'administrateur ${admin.firstName} ${admin.lastName}`,
      })
    } catch {
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <PageHero
        icon={Shield}
        title="Gestion des Administrateurs"
        subtitle={`${data?.pagination.totalItems.toLocaleString() || 0} administrateurs au total`}
        rightSlot={(
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-9 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <PermissionGate permission="admins.manage">
              <Button size="sm" onClick={handleCreateOpen} className="h-9 bg-white text-[#234D65] hover:bg-white/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Nouvel Admin
              </Button>
            </PermissionGate>
          </div>
        )}
      />

      {/* Statistiques compactes - alignées avec caisse imprévue */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {[
          { title: 'Total', value: stats.total, color: '#234D65', icon: Users },
          { title: 'Actifs', value: stats.active, color: '#10b981', icon: CheckCircle2 },
          { title: 'Inactifs', value: stats.total - stats.active, color: '#ef4444', icon: Ban },
          { title: 'Super Admins', value: stats.byRole.SuperAdmin, color: '#8b5cf6', icon: ShieldCheck },
          { title: 'Admins', value: stats.byRole.Admin, color: '#3b82f6', icon: Shield },
          { title: 'Secrétaires', value: stats.byRole.Secretary, color: '#f59e0b', icon: Edit3 },
        ].map((stat, i) => (
          <div
            key={i}
            className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200"
          >
            <div
              className="p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
            >
              <stat.icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">{stat.title}</p>
              <p className="text-sm font-black text-gray-900 tabular-nums truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques de répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des rôles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Répartition par Rôles</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {stats.roleData.length > 0 ? (
              <DashboardPieChart data={stats.roleData} />
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
              <DashboardPieChart data={stats.statusData} />
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500">
                Aucune donnée à afficher
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4">
              {stats.statusData.map((item, _index) => (
                <div key={_index} className="flex items-center gap-2">
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
              <Card key={admin.id} className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-5">
                  <div className="flex items-start justify-between gap-3">
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
                  <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-3">
                    <Badge
                      variant={admin.isActive ? 'default' : 'secondary'}
                      className={`text-xs ${admin.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                    >
                      {admin.isActive ? 'Actif' : 'Inactif'}
                    </Badge>

                    <PermissionGate
                      permission="admins.manage"
                      fallback={<span className="text-[11px] text-gray-400">Lecture seule</span>}
                    >
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
                    </PermissionGate>
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