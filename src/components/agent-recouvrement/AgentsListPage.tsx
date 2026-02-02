'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, LayoutGrid, List, MoreVertical, Eye, Pencil, Pause, Play, Trash2 } from 'lucide-react'
import { AgentsListStats } from './AgentsListStats'
import { AgentFilterBadgesCarousel } from './AgentFilterBadgesCarousel'
import { AgentCard } from './AgentCard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CreateAgentModal,
  EditAgentModal,
  DesactiverAgentModal,
  ReactiverAgentModal,
  SupprimerAgentModal,
} from './modals'
import {
  useAgentsRecouvrement,
  useAgentsRecouvrementStats,
  useCreateAgentRecouvrement,
  useUpdateAgentRecouvrement,
  useDeactivateAgentRecouvrement,
  useReactivateAgentRecouvrement,
  useDeleteAgentRecouvrement,
} from '@/hooks/agent-recouvrement'
import type { AgentRecouvrement, AgentRecouvrementFilterTab } from '@/types/types'
import { useDebounce } from '@/hooks/useDebounce'
import { toast } from 'sonner'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'
import { formatAgentDate } from '@/utils/agentDateUtils'

export function AgentsListPage() {
  const router = useRouter()
  const [tab, setTab] = useState<AgentRecouvrementFilterTab>('actifs')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [orderBy, setOrderBy] = useState<'nom-asc' | 'nom-desc' | 'prenom-asc' | 'prenom-desc' | 'createdAt-desc'>('nom-asc')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<AgentRecouvrement | null>(null)
  const [desactiverAgent, setDesactiverAgent] = useState<AgentRecouvrement | null>(null)
  const [reactiverAgent, setReactiverAgent] = useState<AgentRecouvrement | null>(null)
  const [supprimerAgent, setSupprimerAgent] = useState<AgentRecouvrement | null>(null)

  const [orderByField, orderByDirection] = orderBy.split('-') as ['nom' | 'prenom' | 'createdAt', 'asc' | 'desc']
  const filters = { tab, searchQuery: debouncedSearch, orderByField, orderByDirection }
  const { data, isLoading, error } = useAgentsRecouvrement(filters, page, 12)
  const { data: stats, isLoading: statsLoading } = useAgentsRecouvrementStats()
  const createMutation = useCreateAgentRecouvrement()
  const updateMutation = useUpdateAgentRecouvrement()
  const deactivateMutation = useDeactivateAgentRecouvrement()
  const reactivateMutation = useReactivateAgentRecouvrement()
  const deleteMutation = useDeleteAgentRecouvrement()

  const agents = data?.data ?? []
  const pagination = data?.pagination
  const counts = stats
    ? {
        actifs: stats.actifs,
        tous: stats.total,
        inactifs: stats.inactifs,
        anniversaires: stats.anniversairesMois,
      }
    : undefined

  const handleCreateSuccess = () => {
    setCreateModalOpen(false)
    toast.success('Agent créé avec succès')
  }

  const handleEditSuccess = () => {
    setEditAgent(null)
    toast.success('Agent modifié avec succès')
  }

  const handleDesactiverSuccess = () => {
    setDesactiverAgent(null)
    toast.success('Agent désactivé')
  }

  const handleReactiverSuccess = () => {
    setReactiverAgent(null)
    toast.success('Agent réactivé')
  }

  const handleSupprimerSuccess = () => {
    setSupprimerAgent(null)
    toast.success('Agent supprimé')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Button onClick={() => setCreateModalOpen(true)} className="bg-[#234D65] hover:bg-[#2c5a73]">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel agent
        </Button>
      </div>

      <AgentsListStats stats={stats} isLoading={statsLoading} />

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="lg:hidden w-full">
          <AgentFilterBadgesCarousel value={tab} onChange={setTab} counts={counts} />
        </div>
        <div className="hidden lg:grid grid-cols-4 gap-2 w-full max-w-2xl">
          {(['actifs', 'tous', 'inactifs', 'anniversaires'] as const).map((t) => (
            <Button
              key={t}
              variant={tab === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab(t)}
              className={tab === t ? 'bg-[#234D65]' : ''}
            >
              {t === 'actifs' && 'Actifs'}
              {t === 'tous' && 'Tous'}
              {t === 'inactifs' && 'Inactifs'}
              {t === 'anniversaires' && 'Anniv. mois'}
              {counts && ` (${counts[t]})`}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher nom, prénom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={orderBy} onValueChange={(v) => setOrderBy(v as typeof orderBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tri" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nom-asc">Nom A-Z</SelectItem>
            <SelectItem value="nom-desc">Nom Z-A</SelectItem>
            <SelectItem value="prenom-asc">Prénom A-Z</SelectItem>
            <SelectItem value="prenom-desc">Prénom Z-A</SelectItem>
            <SelectItem value="createdAt-desc">Plus récent</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex rounded-md border">
          <Button
            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">Erreur lors du chargement des agents</div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucun agent de recouvrement
          {searchQuery && ` pour "${searchQuery}"`}
        </div>
      ) : (
        <>
          {pagination && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Affichage {(page - 1) * 12 + 1}-{Math.min(page * 12, pagination.totalItems)} sur {pagination.totalItems} agents
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={setEditAgent}
                  onDesactiver={setDesactiverAgent}
                  onReactiver={setReactiverAgent}
                  onSupprimer={setSupprimerAgent}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Photo</th>
                    <th className="text-left p-3 font-medium">Nom</th>
                    <th className="text-left p-3 font-medium">Pièce</th>
                    <th className="text-left p-3 font-medium">Naissance</th>
                    <th className="text-left p-3 font-medium">Lieu</th>
                    <th className="text-left p-3 font-medium">Tél</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const initiales = `${(agent.prenom?.[0] || '').toUpperCase()}${(agent.nom?.[0] || '').toUpperCase()}`
                    return (
                      <tr key={agent.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={agent.photoUrl || undefined} alt={`${agent.prenom} ${agent.nom}`} />
                            <AvatarFallback className="text-sm">{initiales}</AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{agent.nom}</div>
                          <div className="text-sm text-muted-foreground">{agent.prenom}</div>
                        </td>
                        <td className="p-3 text-sm">{agent.pieceIdentite?.type} {agent.pieceIdentite?.numero}</td>
                        <td className="p-3 text-sm">{formatAgentDate(agent.dateNaissance)}</td>
                        <td className="p-3 text-sm">{agent.lieuNaissance || '—'}</td>
                        <td className="p-3 text-sm">{agent.tel1}</td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(routes.admin.agentRecouvrementDetails(agent.id))}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditAgent(agent)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {agent.actif ? (
                                <DropdownMenuItem onClick={() => setDesactiverAgent(agent)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Désactiver
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setReactiverAgent(agent)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Réactiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onClick={() => setSupprimerAgent(agent)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600 pt-4">
              <span>
                Affichage {(page - 1) * 12 + 1}-{Math.min(page * 12, pagination.totalItems)} sur {pagination.totalItems} agents
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateAgentModal open={createModalOpen} onOpenChange={setCreateModalOpen} onSuccess={handleCreateSuccess} mutation={createMutation} />
      {editAgent && (
        <EditAgentModal
          agent={editAgent}
          open={!!editAgent}
          onOpenChange={(o: boolean) => !o && setEditAgent(null)}
          onSuccess={handleEditSuccess}
          mutation={updateMutation}
        />
      )}
      {desactiverAgent && (
        <DesactiverAgentModal
          agent={desactiverAgent}
          open={!!desactiverAgent}
          onOpenChange={(o: boolean) => !o && setDesactiverAgent(null)}
          onSuccess={handleDesactiverSuccess}
          mutation={deactivateMutation}
        />
      )}
      {reactiverAgent && (
        <ReactiverAgentModal
          agent={reactiverAgent}
          open={!!reactiverAgent}
          onOpenChange={(o: boolean) => !o && setReactiverAgent(null)}
          onSuccess={handleReactiverSuccess}
          mutation={reactivateMutation}
        />
      )}
      {supprimerAgent && (
        <SupprimerAgentModal
          agent={supprimerAgent}
          open={!!supprimerAgent}
          onOpenChange={(o: boolean) => !o && setSupprimerAgent(null)}
          onSuccess={handleSupprimerSuccess}
          mutation={deleteMutation}
        />
      )}
    </div>
  )
}
