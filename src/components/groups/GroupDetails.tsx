"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Trash2, Users, Search, UserPlus, Calendar, Mail, IdCard, UserCheck, Filter, Sparkles, ArrowLeft } from 'lucide-react'
import type { Group, User } from '@/types/types'
import { listGroups } from '@/db/group.db'
import { useMembers } from '@/hooks/useMembers'
import { toast } from 'sonner'
import { updateUser } from '@/db/user.db'
import { removeMemberFromGroup } from '@/db/member.db'
import { updateGroup } from '@/db/group.db'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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

  const { data: membersData, refetch } = useMembers({} as any, 1, 500)
  const members: User[] = (membersData?.data || []) as any
  const groupMembers = members.filter((m) => (m as any).groupId === groupId)
  const [addOpen, setAddOpen] = React.useState(false)
  const [toRemove, setToRemove] = React.useState<User | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
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
            title="Total membres"
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
                  className="h-12 px-6 bg-gradient-to-r from-[#234D65] to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl" 
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> 
                  Ajouter un membre
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
                    : 'Commencez par ajouter des membres à ce groupe.'
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
                    const ok = await removeMemberFromGroup(toRemove.id, 'system')
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
    const base = allMembers.filter((m) => !(m as any).groupId)
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter((m) =>
      m.firstName.toLowerCase().includes(q) ||
      m.lastName.toLowerCase().includes(q) ||
      (m.matricule || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    )
  }, [allMembers, search])

  const handleAdd = async (userId: string) => {
    try {
      setAdding((s) => ({ ...s, [userId]: true }))
      const ok = await updateUser(userId, { groupId })
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
            Sélectionnez un ou plusieurs membres sans groupe et ajoutez-les à ce groupe
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
                    : 'Tous les membres sont déjà assignés à des groupes.'
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