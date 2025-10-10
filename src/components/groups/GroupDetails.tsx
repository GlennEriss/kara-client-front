"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Trash2, Users, Search, UserPlus, Calendar, Mail, IdCard, UserCheck, Filter, ArrowLeft, FileText, Download } from 'lucide-react'
import type { Group, User } from '@/types/types'
import { listGroups } from '@/db/group.db'
import { useAllMembers } from '@/hooks/useMembers'
import { toast } from 'sonner'
import { updateUser } from '@/db/user.db'
import { updateGroup } from '@/db/group.db'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { useCaisseSettingsValidation } from '@/hooks/useCaisseSettingsValidation'
import { getNationalityName } from '@/constantes/nationality'

interface Props { groupId: string }

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
    trend?: string
    className?: string
}) => {
    return (
        <Card className={`group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-xl border-0 ${className}`}>
            {/* Effet de fond animé */}
            <div
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                style={{ backgroundColor: color }}
            />
            <div
                className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full opacity-10 group-hover:opacity-20 transition-all duration-700 transform translate-x-12 sm:translate-x-16 -translate-y-12 sm:-translate-y-16 group-hover:scale-150"
                style={{ backgroundColor: color }}
            />

            <CardContent className="p-4 sm:p-6 relative z-10">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color }} />
                    </div>
                    <div className="text-right">
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:scale-110 transition-transform duration-300">
                            {value}
                        </div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {title}
                        </div>
                    </div>
                </div>

                {trend && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {trend}
                    </div>
                )}

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

export default function GroupDetails({ groupId }: Props) {
    const router = useRouter()
    const [group, setGroup] = React.useState<Group | null>(null)
    const [isLoading, setIsLoading] = React.useState(false)
    const [query, setQuery] = React.useState('')

    const { data: membersData, refetch } = useAllMembers({}, 1, 500)
    const members: User[] = (membersData?.data || []) as any
    const groupMembers = members.filter((m) => (m as any).groupIds?.includes(groupId))
    const [addOpen, setAddOpen] = React.useState(false)
    const [createContractOpen, setCreateContractOpen] = React.useState(false)
    const [toRemove, setToRemove] = React.useState<User | null>(null)
    const [isRemoving, setIsRemoving] = React.useState(false)
    const [isExporting, setIsExporting] = React.useState(false)

    React.useEffect(() => {
        ; (async () => {
            setIsLoading(true)
            try {
                const all = await listGroups()
                const g = all.find((x) => x.id === groupId) || null
                setGroup(g)
            } catch {
                toast.error('❌ Erreur chargement groupe')
            } finally {
                setIsLoading(false)
            }
        })()
    }, [groupId])

    const filteredMembers = groupMembers.filter((m) => {
        const q = query.trim().toLowerCase()
        if (!q) return true
        return (
            m.firstName.toLowerCase().includes(q) ||
            m.lastName.toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q) ||
            (m.matricule || '').toLowerCase().includes(q)
        )
    })

    const exportToExcel = async () => {
        if (filteredMembers.length === 0) {
            toast.error('Aucun membre à exporter')
            return
        }

        setIsExporting(true)
        try {
            // Préparer les données pour l'export
            const exportData = filteredMembers.map((member: any) => {
                const toISO = (v: any) => {
                    try {
                        if (!v) return ''
                        const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
                        return isNaN(d.getTime()) ? '' : d.toISOString()
                    } catch {
                        return ''
                    }
                }

                return {
                    'Matricule': member?.matricule || member?.id || '',
                    'Prénom': member?.firstName || '',
                    'Nom': member?.lastName || '',
                    'Email': member?.email || '',
                    'Sexe': member?.gender || '',
                    'Nationalité': getNationalityName(member?.nationality),
                    'Profession': member?.profession || '',
                    'Province': member?.address?.province || '',
                    'Ville': member?.address?.city || '',
                    'Quartier': member?.address?.district || '',
                    'Arrondissement': member?.address?.arrondissement || '',
                    'Téléphones': Array.isArray(member?.contacts) ? member.contacts.join(' | ') : '',
                    'Possède un véhicule': member?.hasCar ? 'Oui' : 'Non',
                    'Date d\'adhésion': toISO(member?.createdAt),
                    'Dernière modification': toISO(member?.updatedAt),
                    'Nombre de groupes': (member?.groupIds || []).length,
                    'Autres groupes': (member?.groupIds || []).filter((id: string) => id !== groupId).length,
                }
            })

            // Créer le fichier CSV avec BOM pour Excel
            const headers = Object.keys(exportData[0])
            
            // Ajouter le BOM UTF-8 pour Excel
            const BOM = '\uFEFF'
            
            const csvContent = BOM + [
                headers.join(';'),
                ...exportData.map((row: Record<string, any>) => 
                    headers.map(header => {
                        const value = row[header]
                        // Échapper les points-virgules et guillemets dans les valeurs
                        if (typeof value === 'string' && (value.includes(';') || value.includes('"'))) {
                            return `"${value.replace(/"/g, '""')}"`
                        }
                        return value
                    }).join(';')
                )
            ].join('\r\n')

            // Créer et télécharger le fichier
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `membres-groupe-${group?.name || 'groupe'}-${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success('Export réussi !')
        } catch (error) {
            console.error('Erreur lors de l\'export:', error)
            toast.error('Erreur lors de l\'export')
        } finally {
            setIsExporting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
                <div className="container mx-auto">
                    <Card className="shadow-2xl border-0 overflow-hidden">
                        <CardContent className="p-8 sm:p-12 lg:p-16 text-center">
                            <div className="animate-pulse space-y-4">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#234D65] to-blue-600 rounded-xl sm:rounded-2xl mx-auto opacity-80" />
                                <div className="h-6 sm:h-8 bg-gray-200 rounded-lg w-48 sm:w-64 mx-auto" />
                                <div className="h-3 sm:h-4 bg-gray-100 rounded w-32 sm:w-48 mx-auto" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
            {/* Éléments de fond décoratifs */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-[#234D65]/10 to-blue-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-emerald-400/10 to-green-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/3 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
                {/* En-tête du groupe */}
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#234D65]/20 to-blue-600/20 rounded-2xl lg:rounded-3xl blur-xl opacity-60" />
                    <Card className="relative bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#234D65] via-blue-600 to-purple-600" />
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => router.back()}
                                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl lg:rounded-2xl bg-white/80 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-0 flex-shrink-0"
                                    >
                                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </Button>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#234D65] to-blue-600 rounded-xl lg:rounded-2xl flex items-center justify-center">
                                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                            </div>
                                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black bg-gradient-to-r from-[#234D65] to-blue-600 bg-clip-text text-transparent leading-tight">
                                                {group?.name || 'Groupe'}
                                            </h1>
                                            {group?.label && (
                                                <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 hidden sm:inline-flex">
                                                    {group.label}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                            {group?.label && (
                                                <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 sm:hidden self-start">
                                                    {group.label}
                                                </Badge>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    Créé le {group?.createdAt && !isNaN(new Date(group.createdAt as any).getTime())
                                                        ? new Date(group.createdAt as any).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })
                                                        : '—'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {group?.description && (
                                <div className="mt-6 p-4 bg-white/60 rounded-xl border border-white/50">
                                    <p className="text-gray-700 leading-relaxed">{group.description}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Statistiques modernes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <StatCard
                        title="Membres du groupe"
                        value={groupMembers.length}
                        icon={Users}
                        color="#3b82f6"
                        trend="actifs dans le groupe"
                    />
                    <StatCard
                        title="Résultats de recherche"
                        value={filteredMembers.length}
                        icon={Filter}
                        color="#10b981"
                        trend="correspondances trouvées"
                    />
                    <StatCard
                        title="Total"
                        value={members.length}
                        icon={UserCheck}
                        color="#f59e0b"
                        trend="dans l'organisation"
                    />
                </div>

                {/* Barre de recherche et actions */}
                <Card className="bg-white/70 backdrop-blur-sm rounded-xl lg:rounded-2xl shadow-xl border border-white/50">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#234D65] transition-colors duration-300" />
                                    <Input
                                        placeholder="Rechercher un membre (nom, email, matricule)..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="pl-12 h-12 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 bg-white/80 rounded-xl transition-all duration-300"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => refetch()}
                                    className="h-12 px-6 border-2 border-gray-300 hover:border-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300 rounded-xl"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Actualiser
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={exportToExcel}
                                    disabled={isExporting || filteredMembers.length === 0}
                                    className="h-12 px-6 border-2 border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700 hover:text-green-800 transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin mr-2" />
                                            Export...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4 mr-2" />
                                            Exporter Excel
                                        </>
                                    )}
                                </Button>
                                <Button
                                    className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                                    onClick={() => setAddOpen(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter un membre
                                </Button>
                                <Button
                                    className="h-12 px-6 bg-gradient-to-r from-[#CBB171] to-[#D4C084] hover:from-[#D4C084] hover:to-[#CBB171] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                                    onClick={() => setCreateContractOpen(true)}
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Créer un contrat
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Liste des membres */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-[#234D65]" />
                            Membres du Groupe ({filteredMembers.length})
                        </h2>
                    </div>

                    {filteredMembers.length === 0 ? (
                        <Card className="bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/50">
                            <CardContent className="p-12 text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                                    <Users className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                    {query ? 'Aucun membre trouvé' : 'Aucun membre dans ce groupe'}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    {query
                                        ? 'Essayez de modifier votre recherche.'
                                        : 'Commencez par ajouter des membres à ce groupe. Les membres peuvent appartenir à plusieurs groupes simultanément.'
                                    }
                                </p>
                                {!query && (
                                    <Button
                                        onClick={() => setAddOpen(true)}
                                        className="bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Ajouter des membres
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                            {filteredMembers.map((m) => (
                                <Card key={m.id} className="group bg-white/70 backdrop-blur-sm rounded-xl shadow-xl border border-white/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600" />

                                    <CardContent className="p-4 sm:p-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#234D65] to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                    {m.firstName[0]}{m.lastName[0]}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-gray-900 truncate group-hover:text-[#234D65] transition-colors duration-300">
                                                        {m.firstName} {m.lastName}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                                        <IdCard className="w-3 h-3" />
                                                        <span className="truncate">{m.matricule}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail className="w-4 h-4 text-blue-500" />
                                                    <span className="truncate">{m.email || '—'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {/* Afficher les autres groupes si le membre en a */}
                                                {(m as any).groupIds && (m as any).groupIds.length > 1 && (
                                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                                        <Users className="w-3 h-3" />
                                                        <span>+{(m as any).groupIds.length - 1} autre{(m as any).groupIds.length > 2 ? 's' : ''} groupe{(m as any).groupIds.length > 2 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                        Membre actif
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setToRemove(m)}
                                                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors duration-300"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal ajout de membre */}
                <AddMemberDialog
                    open={addOpen}
                    onClose={() => setAddOpen(false)}
                    groupId={groupId}
                    allMembers={members}
                    onAdded={async () => {
                        await refetch()
                        toast.success('✅ Membre ajouté au groupe avec succès')
                    }}
                />

                {/* Modal création de contrat pour le groupe */}
                <CreateGroupCaisseContractButton
                    open={createContractOpen}
                    onClose={() => setCreateContractOpen(false)}
                    groupId={groupId}
                    groupName={group?.name || 'Groupe'}
                    onCreated={async () => {
                        toast.success('✅ Contrat créé pour le groupe avec succès')
                    }}
                />

                {/* Confirmation suppression membre du groupe */}
                <Dialog open={!!toRemove} onOpenChange={(open) => { if (!isRemoving && !open) setToRemove(null) }}>
                    <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-red-600">
                                Retirer le membre du groupe
                            </DialogTitle>
                            <DialogDescription className="text-gray-600">
                                Voulez-vous vraiment retirer <strong>{toRemove?.firstName} {toRemove?.lastName}</strong> de ce groupe ?
                                Cette action peut être annulée en rajoutant le membre.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setToRemove(null)}
                                disabled={isRemoving}
                                className="h-11 px-6 border-2 rounded-lg"
                            >
                                Annuler
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (!toRemove) return
                                    try {
                                        setIsRemoving(true)
                                        // Retirer le groupe de la liste des groupes du membre
                                        const currentGroupIds = (toRemove as any).groupIds || []
                                        const newGroupIds = currentGroupIds.filter((id: string) => id !== groupId)
                                        const ok = await updateUser(toRemove.id, { groupIds: newGroupIds })
                                        if (!ok) throw new Error('fail')
                                        await updateGroup(groupId, { updatedBy: 'system' })
                                        await refetch()
                                        toast.success('✅ Membre retiré du groupe avec succès')
                                        setToRemove(null)
                                    } catch {
                                        toast.error('❌ Impossible de retirer ce membre')
                                    } finally {
                                        setIsRemoving(false)
                                    }
                                }}
                                disabled={isRemoving}
                                className="h-11 px-6 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg"
                            >
                                {isRemoving ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Retrait...
                                    </div>
                                ) : (
                                    'Retirer'
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
      `}</style>
        </div>
    )
}

function AddMemberDialog({
    open,
    onClose,
    groupId,
    allMembers,
    onAdded
}: {
    open: boolean
    onClose: () => void
    groupId: string
    allMembers: User[]
    onAdded: () => Promise<void>
}) {
    const [search, setSearch] = React.useState('')
    const [adding, setAdding] = React.useState<Record<string, boolean>>({})

    const candidates = React.useMemo(() => {
        // Maintenant on peut ajouter des membres qui appartiennent déjà à d'autres groupes
        // On exclut seulement ceux qui sont déjà dans ce groupe spécifique
        const base = allMembers.filter((m) => {
            const memberGroupIds = (m as any).groupIds || []
            return !memberGroupIds.includes(groupId)
        })
        const q = search.trim().toLowerCase()
        if (!q) return base
        return base.filter((m) =>
            m.firstName.toLowerCase().includes(q) ||
            m.lastName.toLowerCase().includes(q) ||
            (m.matricule || '').toLowerCase().includes(q) ||
            (m.email || '').toLowerCase().includes(q)
        )
    }, [allMembers, search, groupId])

    const handleAdd = async (userId: string) => {
        try {
            setAdding((s) => ({ ...s, [userId]: true }))
            // Ajouter le groupe à la liste existante des groupes du membre
            const member = allMembers.find(m => m.id === userId)
            const currentGroupIds = (member as any)?.groupIds || []
            const newGroupIds = [...currentGroupIds, groupId]
            const ok = await updateUser(userId, { groupIds: newGroupIds })
            if (!ok) throw new Error('Échec de la mise à jour')
            await onAdded()
        } catch {
            toast.error('❌ Impossible d\'ajouter ce membre')
        } finally {
            setAdding((s) => ({ ...s, [userId]: false }))
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!Object.values(adding).some(Boolean)) onClose() }}>
            <DialogContent className="sm:max-w-4xl bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-[#234D65] to-blue-600 bg-clip-text text-transparent">
                        Ajouter un membre au groupe
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        Sélectionnez un ou plusieurs membres et ajoutez-les à ce groupe. Les membres peuvent appartenir à plusieurs groupes simultanément.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#234D65] transition-colors duration-300" />
                        <Input
                            placeholder="Rechercher par nom, matricule ou email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-12 h-12 border-2 border-gray-200 focus:border-[#234D65] focus:ring-2 focus:ring-[#234D65]/20 rounded-xl transition-all duration-300"
                        />
                    </div>

                    <div className="max-h-[60vh] overflow-auto space-y-3 pr-2">
                        {candidates.length === 0 && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <Users className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {search ? 'Aucun membre trouvé' : 'Aucun membre disponible'}
                                </h3>
                                <p className="text-gray-600">
                                    {search
                                        ? 'Essayez de modifier votre recherche.'
                                        : 'Tous les membres sont déjà dans ce groupe.'
                                    }
                                </p>
                            </div>
                        )}

                        {candidates.map((m) => (
                            <Card key={m.id} className="bg-white/70 backdrop-blur-sm border border-white/50 hover:shadow-lg transition-all duration-300">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 bg-gradient-to-br from-[#234D65] to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {m.firstName[0]}{m.lastName[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-gray-900 truncate">
                                                    {m.firstName} {m.lastName}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <IdCard className="w-3 h-3" />
                                                        {m.matricule}
                                                    </span>
                                                    <span className="flex items-center gap-1 truncate">
                                                        <Mail className="w-3 h-3" />
                                                        {m.email || '—'}
                                                    </span>
                                                </div>
                                                {/* Afficher les groupes existants si le membre en a déjà */}
                                                {(m as any).groupIds && (m as any).groupIds.length > 0 && (
                                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                                        <Users className="w-3 h-3" />
                                                        <span>Déjà dans {(m as any).groupIds.length} autre{(m as any).groupIds.length > 1 ? 's' : ''} groupe{(m as any).groupIds.length > 1 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            className="bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 ml-4 flex-shrink-0"
                                            onClick={() => handleAdd(m.id)}
                                            disabled={!!adding[m.id]}
                                        >
                                            {adding[m.id] ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Ajout...
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <UserPlus className="w-4 h-4" />
                                                    Ajouter
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={Object.values(adding).some(Boolean)}
                        className="h-11 px-6 border-2 rounded-lg"
                    >
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CreateGroupCaisseContractButton({
    open,
    onClose,
    groupId,
    groupName,
    onCreated
}: {
    open: boolean
    onClose: () => void
    groupId: string
    groupName: string
    onCreated: () => Promise<void>
}) {
    const router = useRouter()
    const [amount, setAmount] = React.useState(10000)
    const [months, setMonths] = React.useState(12)
    const [caisseType, setCaisseType] = React.useState<'STANDARD' | 'JOURNALIERE' | 'LIBRE'>('STANDARD')
    const [firstPaymentDate, setFirstPaymentDate] = React.useState('')
    const [loading, setLoading] = React.useState(false)

    // Validation des paramètres de la Caisse Spéciale
    const { isValid, isLoading: isValidating, error: validationError, settings } = useCaisseSettingsValidation(caisseType)

    const isDaily = caisseType === 'JOURNALIERE'
    const isLibre = caisseType === 'LIBRE'

    React.useEffect(() => {
        if (isLibre && amount < 100000) {
            setAmount(100000)
        }
    }, [caisseType])

    const onCreate = async () => {
        try {
            setLoading(true)
            
            // Validation des paramètres de la Caisse Spéciale
            if (!isValid || isValidating) {
                toast.error('Les paramètres de la Caisse Spéciale ne sont pas configurés. Impossible de créer un contrat.')
                return
            }
            
            if (isLibre && amount < 100000) {
                toast.error('Pour un contrat Libre, le montant mensuel doit être au minimum 100 000 FCFA.')
                return
            }
            if (!firstPaymentDate) {
                toast.error('Veuillez sélectionner la date du premier versement.')
                return
            }

            // Créer le contrat pour le groupe
            const { subscribe } = await import('@/services/caisse/mutations')
            await subscribe({ 
                groupeId: groupId,
                monthlyAmount: amount, 
                monthsPlanned: months, 
                caisseType, 
                firstPaymentDate
            })
            
            toast.success('Contrat créé pour le groupe')
            onClose()
            await onCreated()
        } catch (e: any) {
            toast.error(e?.message || 'Création impossible')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !loading && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nouveau contrat Caisse Spéciale - {groupName}</DialogTitle>
                    <DialogDescription>Définissez le montant, la durée et la caisse pour ce groupe.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm mb-1">
                            {caisseType === 'STANDARD' ? 'Montant mensuel' : caisseType === 'JOURNALIERE' ? 'Objectif mensuel' : 'Montant mensuel (minimum 100 000)'}
                        </label>
                        <input
                            type="number"
                            min={isLibre ? 100000 : 100}
                            step={100}
                            className="border rounded p-2 w-full"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                        {isDaily && (
                            <div className="text-xs text-gray-500 mt-1">L'objectif est atteint par contributions quotidiennes sur le mois.</div>
                        )}
                        {isLibre && (
                            <div className="text-xs text-gray-500 mt-1">Le total versé par mois doit être au moins 100 000 FCFA.</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Durée (mois)</label>
                        <input type="number" min={1} max={12} className="border rounded p-2 w-full" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Caisse</label>
                        <select className="border rounded p-2 w-full" value={caisseType} onChange={(e) => setCaisseType(e.target.value as 'STANDARD' | 'JOURNALIERE' | 'LIBRE')}>
                            <option value="STANDARD">Standard</option>
                            <option value="JOURNALIERE">Journalière</option>
                            <option value="LIBRE">Libre</option>
                        </select>
                        
                        {/* Validation des paramètres */}
                        {isValidating && (
                            <div className="text-xs text-blue-600 mt-1">Vérification des paramètres...</div>
                        )}
                        
                        {!isValidating && !isValid && validationError && (
                            <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 border border-red-200 rounded-md">
                                <div className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0">⚠️</div>
                                <div className="text-xs text-red-700">
                                    <div className="font-medium mb-1">Paramètres manquants</div>
                                    <div>{validationError}</div>
                                    <div className="mt-2 text-red-600">
                                        Veuillez configurer les paramètres de la Caisse Spéciale dans l'administration avant de créer un contrat.
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {!isValidating && isValid && settings && (
                            <div className="flex items-start gap-2 p-3 mt-2 bg-green-50 border border-green-200 rounded-md">
                                <div className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0">✓</div>
                                <div className="text-xs text-green-700">
                                    <div className="font-medium mb-1">Paramètres configurés</div>
                                    <div>Version active depuis le {new Date(settings.effectiveAt?.toDate?.() || settings.effectiveAt).toLocaleDateString('fr-FR')}</div>
                                    <div className="mt-2 text-green-600">
                                        Vous pouvez maintenant créer un contrat avec ce type de caisse.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Date du premier versement *</label>
                        <input 
                            type="date" 
                            className="border rounded p-2 w-full" 
                            value={firstPaymentDate} 
                            onChange={(e) => setFirstPaymentDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            required
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
                    <Button 
                        className="bg-[#CBB171] text-white hover:bg-[#D4C084]" 
                        onClick={onCreate} 
                        disabled={loading || !isValid || isValidating}
                    >
                        {loading ? 'Création…' : 'Créer pour le groupe'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}