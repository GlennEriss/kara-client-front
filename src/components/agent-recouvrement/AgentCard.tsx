'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import routes from '@/constantes/routes'
import type { AgentRecouvrement } from '@/types/types'
import { getAgentAge } from '@/utils/agentDateUtils'
import { Eye, IdCard, MoreVertical, Pause, Pencil, Phone, Play, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AgentCardProps {
  agent: AgentRecouvrement
  onEdit?: (agent: AgentRecouvrement) => void
  onDesactiver?: (agent: AgentRecouvrement) => void
  onReactiver?: (agent: AgentRecouvrement) => void
  onSupprimer?: (agent: AgentRecouvrement) => void
}

export function AgentCard({ agent, onEdit, onDesactiver, onReactiver, onSupprimer }: AgentCardProps) {
  const router = useRouter()
  const age = agent.dateNaissance ? getAgentAge(agent.dateNaissance) : null
  const initiales = `${(agent.prenom?.[0] || '').toUpperCase()}${(agent.nom?.[0] || '').toUpperCase()}`

  const handleDetails = () => {
    router.push(routes.admin.agentRecouvrementDetails(agent.id))
  }

  const statusMeta = agent.actif
    ? { label: 'Actif', dot: 'bg-emerald-500', text: 'text-emerald-700' }
    : { label: 'Inactif', dot: 'bg-gray-400', text: 'text-gray-500' }

  return (
    <Card className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-gray-200 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-4 p-4 md:p-5">
        {/* Header : avatar + nom à gauche, statut dot + menu à droite */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9 shrink-0 rounded-xl">
              <AvatarImage src={agent.photoUrl || undefined} alt={`${agent.prenom} ${agent.nom}`} />
              <AvatarFallback className="rounded-xl bg-[#234D65] text-[11px] font-semibold text-white">{initiales}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{`${agent.nom || ''} ${agent.prenom || ''}`.trim() || '—'}</p>
              <p className="truncate text-xs text-gray-400">{age !== null ? `${age} ans` : (agent.pieceIdentite?.numero || '—')}</p>
              {/* Statut sous le nom (à droite il tronquait les noms longs). */}
              <span className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${statusMeta.text}`}>
                <span className={`h-2 w-2 rounded-full shrink-0 ${statusMeta.dot}`} />
                {statusMeta.label}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-80 transition-opacity group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDetails}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(agent)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                {agent.actif ? (
                  <DropdownMenuItem onClick={() => onDesactiver?.(agent)}>
                    <Pause className="h-4 w-4 mr-2" />
                    Désactiver
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onReactiver?.(agent)}>
                    <Play className="h-4 w-4 mr-2" />
                    Réactiver
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => onSupprimer?.(agent)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Infos */}
        <div className="space-y-1.5 text-xs text-gray-500">
          {agent.tel1 && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{agent.tel1}</span>
            </div>
          )}
          {agent.tel2 && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{agent.tel2}</span>
            </div>
          )}
          {(agent.pieceIdentite?.type || agent.pieceIdentite?.numero) && (
            <div className="flex items-center gap-2">
              <IdCard className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{agent.pieceIdentite?.type} {agent.pieceIdentite?.numero}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto space-y-2 border-t border-gray-100 pt-3">
          <Button onClick={handleDetails} className="w-full h-9 bg-[#234D65] hover:bg-[#2c5a73] text-white text-sm font-semibold">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Voir détails
          </Button>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onEdit?.(agent)} className="h-9 flex-1 text-xs border-gray-200 text-gray-600 hover:border-[#234D65] hover:text-[#234D65]">
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Modifier
            </Button>
            {agent.actif ? (
              <Button variant="outline" size="sm" onClick={() => onDesactiver?.(agent)} className="h-9 flex-1 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">
                <Pause className="h-3.5 w-3.5 mr-1" />
                Désactiver
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onReactiver?.(agent)} className="h-9 flex-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Play className="h-3.5 w-3.5 mr-1" />
                Réactiver
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onSupprimer?.(agent)} className="h-9 flex-1 text-xs border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
