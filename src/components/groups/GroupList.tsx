"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatsCard as StatChip } from '@/components/ui/stats-card'
import routes from '@/constantes/routes'
import { createGroup, deleteGroup, listGroups, updateGroup } from '@/db/group.db'
import { countMembersByGroup } from '@/db/member.db'
import type { Group } from '@/types/types'
import { BarChart3, Edit, Eye, Plus, RefreshCw, Search, Sparkles, Target, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { toast } from 'sonner'

export default function GroupList() {
    const [groups, setGroups] = React.useState<Group[]>([])
    const [isCreateOpen, setIsCreateOpen] = React.useState(false)
    const [name, setName] = React.useState('')
    const [label, setLabel] = React.useState('')
    const [description, setDescription] = React.useState('')
    const [search, setSearch] = React.useState('')
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        ; (async () => {
            try {
                const data = await listGroups()
                setGroups(data)
            } catch {
                // ignore
            }
        })()
    }, [])

    const filtered = groups.filter((g) => {
        const q = search.trim().toLowerCase()
        if (!q) return true
        return (
            g.name.toLowerCase().includes(q) ||
            (g.description || '').toLowerCase().includes(q) ||
            (g.label || '').toLowerCase().includes(q)
        )
    })

    const handleRefresh = async () => {
        const data = await listGroups()
        setGroups(data)
        toast.success('✅ Groupes actualisés')
    }

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.error('❌ Nom requis')
            return
        }
        try {
            setIsSubmitting(true)
            const created = await createGroup({
                name: name.trim(),
                label: label.trim() || undefined,
                description: description.trim() || undefined,
                createdBy: 'system',
            } as any)
            setGroups((prev) => [created, ...prev])
            setIsCreateOpen(false)
            setName('')
            setLabel('')
            setDescription('')
            toast.success('✅ Groupe créé avec succès')
        } finally {
            setIsSubmitting(false)
        }
    }

    const [toDelete, setToDelete] = React.useState<Group | null>(null)
    const [isDeleting, setIsDeleting] = React.useState(false)
    const [toEdit, setToEdit] = React.useState<Group | null>(null)
    const [isUpdating, setIsUpdating] = React.useState(false)
    const [editName, setEditName] = React.useState('')
    const [editLabel, setEditLabel] = React.useState('')
    const [editDescription, setEditDescription] = React.useState('')

    const openEdit = (g: Group) => {
        setToEdit(g)
        setEditName(g.name)
        setEditLabel(g.label || '')
        setEditDescription(g.description || '')
    }

    const handleUpdate = async () => {
        if (!toEdit) return
        try {
            setIsUpdating(true)
            await updateGroup(toEdit.id, {
                name: editName.trim(),
                label: editLabel.trim() || undefined,
                description: editDescription.trim() || undefined,
                updatedBy: 'system',
            })
            setGroups((prev) => prev.map((g) => (g.id === toEdit.id ? { ...g, name: editName, label: editLabel || undefined, description: editDescription || undefined } : g)))
            setToEdit(null)
            toast.success('✅ Groupe modifié avec succès')
        } finally {
            setIsUpdating(false)
        }
    }

    const handleConfirmDelete = async () => {
        if (!toDelete) return
        try {
            setIsDeleting(true)
            const count = await countMembersByGroup(toDelete.id)
            if (count > 0) {
                toast.error("🚫 Impossible de supprimer le groupe", { description: `Ce groupe contient ${count} membre(s).` })
                return
            }
            await deleteGroup(toDelete.id)
            setGroups((prev) => prev.filter((g) => g.id !== toDelete.id))
            setToDelete(null)
            toast.success('✅ Groupe supprimé avec succès')
        } finally {
            setIsDeleting(false)
        }
    }

    // Données pour les statistiques
    const statsData = [
        {
            title: "Total Groupes",
            value: groups.length,
            icon: Users,
            color: "#3b82f6",
            trend: { value: 12, label: "ce mois" }
        },
        {
            title: "Avec Libellé",
            value: groups.filter(g => g.label).length,
            icon: Target,
            color: "#10b981",
            trend: { value: 8, label: "organisés" }
        },
        {
            title: "Sans Libellé",
            value: groups.filter(g => !g.label).length,
            icon: BarChart3,
            color: "#f59e0b"
        }
    ]

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="relative z-10 container lg:space-y-8">
                {/* Barre de recherche et actions */}
                <Card className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-white/50">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#234D65] transition-colors duration-300" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Rechercher un groupe par nom, libellé ou description..."
                                        className="pl-12 h-12 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 bg-white/80 rounded-xl transition-all duration-300"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    className="h-12 px-6 border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 rounded-xl"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Actualiser
                                </Button>
                                <Button
                                    onClick={() => setIsCreateOpen(true)}
                                    className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nouveau Groupe
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Statistiques compactes - alignées avec caisse imprévue */}
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Statistiques</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {statsData.map((stat, i) => (
                            <StatChip key={i} title={stat.title} value={stat.value} color={stat.color} icon={stat.icon} />
                        ))}
                    </div>
                </div>

                {/* Liste des groupes */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">
                            Liste des Groupes ({filtered.length})
                        </h2>
                    </div>

                    {filtered.length === 0 ? (
                        <Card className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/50">
                            <CardContent className="p-12 text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                                    <Users className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {search ? 'Aucun groupe trouvé' : 'Aucun groupe'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {search
                                        ? 'Essayez de modifier votre recherche.'
                                        : 'Commencez par créer votre premier groupe.'
                                    }
                                </p>
                                {!search && (
                                    <Button
                                        onClick={() => setIsCreateOpen(true)}
                                        className="bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Créer un groupe
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((g) => (
                                <Card key={g.id} className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-sm text-gray-900 truncate">
                                                    {g.name}
                                                </h3>
                                                {g.label && (
                                                    <span className="mt-1 block text-[10px] font-medium text-gray-400">
                                                        {g.label}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Link href={routes.admin.groupDetails(g.id)}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors duration-300">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(g)}
                                                    className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-600 transition-colors duration-300"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={async () => {
                                                        const count = await countMembersByGroup(g.id)
                                                        if (count > 0) {
                                                            toast.error('🚫 Suppression impossible', { description: 'Ce groupe contient des membres.' })
                                                            return
                                                        }
                                                        setToDelete(g)
                                                    }}
                                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors duration-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <p className="text-sm text-gray-600 min-h-[40px] mb-4 line-clamp-2">
                                            {g.description || 'Aucune description disponible'}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>Créé le {new Date(g.createdAt).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}</span>
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal création */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-[#234D65] to-blue-600 bg-clip-text text-transparent">
                                Nouveau Groupe
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Créez un nouveau groupe en définissant ses informations principales
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Nom du groupe *</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Équipe Marketing"
                                    className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-lg transition-all duration-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Libellé</label>
                                <Input
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="Ex: MARKETING"
                                    className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-lg transition-all duration-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Description</label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Description du groupe..."
                                    className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-lg transition-all duration-300"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                disabled={isSubmitting}
                                className="h-11 px-6 border-2 rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={isSubmitting}
                                className="h-11 px-6 bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Création...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        Créer
                                    </div>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal édition */}
                <Dialog open={!!toEdit} onOpenChange={(open) => !isUpdating && !open && setToEdit(null)}>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-[#234D65] to-blue-600 bg-clip-text text-transparent">
                                Modifier le groupe
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Nom du groupe *</label>
                                <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-lg transition-all duration-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Libellé</label>
                                <Input
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-lg transition-all duration-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Description</label>
                                <Input
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="h-11 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-lg transition-all duration-300"
                                />
                            </div>
                        </div>
                        <DialogFooter className="gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setToEdit(null)}
                                disabled={isUpdating}
                                className="h-11 px-6 border-2 rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="h-11 px-6 bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                            >
                                {isUpdating ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Modification...
                                    </div>
                                ) : (
                                    'Modifier'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Confirmation suppression */}
                <Dialog open={!!toDelete} onOpenChange={(open) => !isDeleting && !open && setToDelete(null)}>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-red-600">
                                Confirmer la suppression
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Voulez-vous vraiment supprimer le groupe "<strong>{toDelete?.name}</strong>" ?
                                Cette action est irréversible.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setToDelete(null)}
                                disabled={isDeleting}
                                className="h-11 px-6 border-2 rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="h-11 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                            >
                                {isDeleting ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Suppression...
                                    </div>
                                ) : (
                                    'Supprimer'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
        </div>
    )
}