"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, RefreshCw, Eye, Search, ChevronLeft, ChevronRight, Sparkles, Target, UserCheck, TrendingUp, BarChart3, Edit, Trash2 } from 'lucide-react'
import type { Group } from '@/types/types'
import { createGroup, deleteGroup, listGroups, updateGroup } from '@/db/group.db'
import { toast } from 'sonner'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { countMembersByGroup } from '@/db/member.db'
import { cn } from '@/lib/utils'

// Hook personnalisé pour le carousel avec drag/swipe
const useCarousel = (itemCount: number, itemsPerView: number = 1) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [startPos, setStartPos] = useState(0)
    const [translateX, setTranslateX] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const maxIndex = Math.max(0, itemCount - itemsPerView)

    const goTo = (index: number) => {
        const clampedIndex = Math.max(0, Math.min(index, maxIndex))
        setCurrentIndex(clampedIndex)
        setTranslateX(-clampedIndex * (100 / itemsPerView))
    }

    const goNext = () => goTo(currentIndex + 1)
    const goPrev = () => goTo(currentIndex - 1)

    // Gestion du drag/swipe
    const handleStart = (clientX: number) => {
        setIsDragging(true)
        setStartPos(clientX)
    }

    const handleMove = (clientX: number) => {
        if (!isDragging || !containerRef.current) return

        const diff = clientX - startPos
        const containerWidth = containerRef.current.offsetWidth
        const percentage = (diff / containerWidth) * 100

        const maxDrag = 30
        const clampedPercentage = Math.max(-maxDrag, Math.min(maxDrag, percentage))

        setTranslateX(-currentIndex * (100 / itemsPerView) + clampedPercentage)
    }

    const handleEnd = () => {
        if (!isDragging || !containerRef.current) return

        const containerWidth = containerRef.current.offsetWidth
        const dragDistance = translateX + currentIndex * (100 / itemsPerView)
        const threshold = 15

        if (dragDistance > threshold && currentIndex > 0) {
            goPrev()
        } else if (dragDistance < -threshold && currentIndex < maxIndex) {
            goNext()
        } else {
            setTranslateX(-currentIndex * (100 / itemsPerView))
        }

        setIsDragging(false)
    }

    // Event handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        handleStart(e.clientX)
    }

    const handleTouchStart = (e: React.TouchEvent) => {
        handleStart(e.touches[0].clientX)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX)
    }

    const handleTouchEnd = () => {
        handleEnd()
    }

    // Effect pour gérer les événements globaux
    useEffect(() => {
        if (!isDragging) return

        const handleGlobalMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX)
        }

        const handleGlobalMouseUp = () => {
            handleEnd()
        }

        document.addEventListener('mousemove', handleGlobalMouseMove)
        document.addEventListener('mouseup', handleGlobalMouseUp)

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove)
            document.removeEventListener('mouseup', handleGlobalMouseUp)
        }
    }, [isDragging, startPos, currentIndex])

    return {
        currentIndex,
        goNext,
        goPrev,
        canGoPrev: currentIndex > 0,
        canGoNext: currentIndex < maxIndex,
        translateX,
        containerRef,
        handleMouseDown,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        isDragging
    }
}

// Composant pour une statistique moderne
const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    className = ""
}: {
    title: string
    value: number
    icon: React.ComponentType<any>
    color: string
    trend?: { value: number; label: string }
    className?: string
}) => {
    return (
        <Card className={`group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl border-0 min-w-[280px] sm:min-w-0 h-44 ${className}`}>
            {/* Effet de fond animé */}
            <div
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                style={{ backgroundColor: color }}
            />
            <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-all duration-700 transform translate-x-16 -translate-y-16 group-hover:scale-150"
                style={{ backgroundColor: color }}
            />

            <CardContent className="p-6 relative z-10 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
                            {value}
                        </div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {title}
                        </div>
                    </div>
                </div>

                <div className="min-h-[24px] mt-2">
                    {trend && (
                        <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-opacity-20`} style={{ backgroundColor: color }}>
                                <TrendingUp className="w-3 h-3" style={{ color }} />
                                <span style={{ color }}>{trend.value}%</span>
                            </div>
                            <span className="text-xs text-gray-600">{trend.label}</span>
                        </div>
                    )}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                    <div
                        className="h-2 rounded-full transition-all duration-1000 ease-out"
                        style={{
                            backgroundColor: color,
                            width: value > 0 ? '100%' : '0%'
                        }}
                    />
                </div>
            </CardContent>
        </Card>
    )
}

// Composant Carousel pour les stats
const StatsCarousel = ({ stats }: { stats: any[] }) => {
    const [itemsPerView, setItemsPerView] = useState(1)

    useEffect(() => {
        const updateItemsPerView = () => {
            const width = window.innerWidth
            if (width >= 1024) setItemsPerView(3) // lg
            else if (width >= 768) setItemsPerView(2) // md  
            else setItemsPerView(1) // sm
        }

        updateItemsPerView()
        window.addEventListener('resize', updateItemsPerView)
        return () => window.removeEventListener('resize', updateItemsPerView)
    }, [])

    const {
        currentIndex,
        goNext,
        goPrev,
        canGoPrev,
        canGoNext,
        translateX,
        containerRef,
        handleMouseDown,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        isDragging
    } = useCarousel(stats.length, itemsPerView)

    return (
        <div className="relative">
            {/* Navigation buttons - Seulement sur desktop */}
            

            {/* Carousel container */}
            <div
                ref={containerRef}
                className="overflow-hidden py-2"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    className={cn(
                        "flex transition-transform duration-300 ease-out gap-4",
                        isDragging && "transition-none"
                    )}
                    style={{
                        transform: `translateX(${translateX}%)`,
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                >
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0"
                            style={{ width: `calc(${100 / itemsPerView}% - ${(4 * (itemsPerView - 1)) / itemsPerView}rem)` }}
                        >
                            <StatCard {...stat} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Indicateurs de pagination - Seulement sur mobile */}
            <div className="flex justify-center mt-4 space-x-2 lg:hidden">
                {Array.from({ length: Math.ceil(stats.length / itemsPerView) }).map((_, index) => (
                    <button
                        key={index}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300",
                            Math.floor(currentIndex / itemsPerView) === index
                                ? "bg-[#234D65] w-8"
                                : "bg-gray-300 hover:bg-gray-400"
                        )}
                        onClick={() => {
                            const targetIndex = index * itemsPerView
                            const clampedIndex = Math.min(targetIndex, stats.length - itemsPerView)
                            if (containerRef.current) {
                                const maxIndex = Math.max(0, stats.length - itemsPerView)
                                const finalIndex = Math.max(0, Math.min(clampedIndex, maxIndex))
                                const newTranslateX = -finalIndex * (100 / itemsPerView)
                                containerRef.current.style.transform = `translateX(${newTranslateX}%)`
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

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

                {/* Statistiques avec carousel */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#234D65]" />
                        Aperçu Statistique
                    </h2>
                    <StatsCarousel stats={statsData} />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filtered.map((g) => (
                                <Card key={g.id} className="group bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#234D65] to-blue-600" />

                                    <CardHeader className="pb-4">
                                        <CardTitle className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-[#234D65] transition-colors duration-300">
                                                    {g.name}
                                                </h3>
                                                {g.label && (
                                                    <Badge className="mt-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
                                                        {g.label}
                                                    </Badge>
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