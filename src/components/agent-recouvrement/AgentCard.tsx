'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MoreVertical, Eye, Pencil, Pause, Play, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AgentRecouvrement } from '@/types/types'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'
import { getAgentAge } from '@/utils/agentDateUtils'

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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16 rounded-full shrink-0">
            <AvatarImage src={agent.photoUrl || undefined} alt={`${agent.prenom} ${agent.nom}`} />
            <AvatarFallback className="bg-[#234D65]/10 text-[#234D65] text-lg">{initiales}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge variant={agent.actif ? 'default' : 'secondary'} className="mb-1">
                  {agent.actif ? 'Actif' : 'Inactif'}
                </Badge>
                <p className="font-semibold text-gray-900 truncate">{agent.nom}</p>
                <p className="text-sm text-gray-600 truncate">{agent.prenom}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
            {agent.tel1 && (
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                <span>📞</span> {agent.tel1}
              </p>
            )}
            {agent.tel2 && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <span>📞</span> {agent.tel2}
              </p>
            )}
            {age !== null && <p className="text-sm text-gray-600">{age} ans</p>}
            <p className="text-sm text-gray-600">
              {agent.pieceIdentite?.type} {agent.pieceIdentite?.numero}
            </p>
            <div className="flex flex-col gap-2 mt-3">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleDetails}>
                Voir détails
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => onEdit?.(agent)}>
                Modifier
              </Button>
              {agent.actif ? (
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => onDesactiver?.(agent)}>
                  Désactiver
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => onReactiver?.(agent)}>
                  Réactiver
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => onSupprimer?.(agent)}>
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
