'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import routes from '@/constantes/routes'
import { useAgentRecouvrement, useDeactivateAgentRecouvrement, useDeleteAgentRecouvrement, useReactivateAgentRecouvrement, useUpdateAgentRecouvrement } from '@/hooks/agent-recouvrement'
import { useAuth } from '@/hooks/useAuth'
import { formatAgentDate, getAgentAge, toAgentDate } from '@/utils/agentDateUtils'
import { ArrowLeft, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { backOr } from '@/lib/backNavigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { DesactiverAgentModal, EditAgentModal, ReactiverAgentModal, SupprimerAgentModal } from './modals'

const EXPIRATION_WARNING_DAYS = 30

const EPOCH_TIME = 0

function AgentAlerts({ agent }: { agent: NonNullable<ReturnType<typeof useAgentRecouvrement>['data']> }) {
  const today = new Date()
  const birth = toAgentDate(agent.dateNaissance)
  const expDate = toAgentDate(agent.pieceIdentite?.dateExpiration)
  const alerts: { type: 'birthday' | 'expired' | 'expiring'; message: string; className: string }[] = []

  if (birth && birth.getTime() !== EPOCH_TIME && birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate()) {
    alerts.push({ type: 'birthday', message: "Anniversaire aujourd'hui !", className: 'bg-green-100 text-green-800 border-green-200' })
  }
  if (expDate && expDate.getTime() !== EPOCH_TIME) {
    const daysUntilExp = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExp < 0) {
      alerts.push({ type: 'expired', message: `Pièce d'identité expirée le ${formatAgentDate(expDate)}`, className: 'bg-red-100 text-red-800 border-red-200' })
    } else if (daysUntilExp <= EXPIRATION_WARNING_DAYS) {
      alerts.push({ type: 'expiring', message: `Pièce expire le ${formatAgentDate(expDate)} (dans ${daysUntilExp} jours)`, className: 'bg-amber-100 text-amber-800 border-amber-200' })
    }
  }
  if (alerts.length === 0) return null
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
      {alerts.map((a) => (
        <div key={a.type} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium ${a.className}`}>
          {a.type === 'birthday' ? '🎂' : '⚠️'} {a.message}
        </div>
      ))}
    </div>
  )
}

interface AgentDetailsPageProps {
  agentId: string
}

export function AgentDetailsPage({ agentId }: AgentDetailsPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { data: agent, isLoading, error } = useAgentRecouvrement(agentId)
  const updateMutation = useUpdateAgentRecouvrement()
  const deactivateMutation = useDeactivateAgentRecouvrement()
  const reactivateMutation = useReactivateAgentRecouvrement()
  const deleteMutation = useDeleteAgentRecouvrement()
  const [editOpen, setEditOpen] = useState(false)
  const [desactiverOpen, setDesactiverOpen] = useState(false)
  const [reactiverOpen, setReactiverOpen] = useState(false)
  const [supprimerOpen, setSupprimerOpen] = useState(false)

  const handleEditSuccess = () => {
    setEditOpen(false)
    toast.success('Agent modifié')
  }

  const handleDesactiverSuccess = () => {
    setDesactiverOpen(false)
    toast.success('Agent désactivé')
    router.push(routes.admin.agentsRecouvrement)
  }

  const handleReactiverSuccess = () => {
    setReactiverOpen(false)
    toast.success('Agent réactivé')
  }

  const handleSupprimerSuccess = () => {
    setSupprimerOpen(false)
    toast.success('Agent supprimé')
    router.push(routes.admin.agentsRecouvrement)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => backOr(router, routes.admin.agentsRecouvrement)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="text-center py-12 text-destructive">Agent non trouvé</div>
      </div>
    )
  }

  const age = agent.dateNaissance ? getAgentAge(agent.dateNaissance) : null
  const initiales = `${(agent.prenom?.[0] || '').toUpperCase()}${(agent.nom?.[0] || '').toUpperCase()}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <Button variant="outline" onClick={() => backOr(router, routes.admin.agentsRecouvrement)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          {agent.actif ? (
            <Button variant="outline" onClick={() => setDesactiverOpen(true)}>
              <Pause className="h-4 w-4 mr-2" />
              Désactiver
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setReactiverOpen(true)}>
              <Play className="h-4 w-4 mr-2" />
              Réactiver
            </Button>
          )}
          <Button variant="destructive" onClick={() => setSupprimerOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </div>

      <AgentAlerts agent={agent} />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-full shrink-0">
              <AvatarImage src={agent.photoUrl || undefined} alt={`${agent.prenom} ${agent.nom}`} />
              <AvatarFallback className="bg-[#234D65]/10 text-[#234D65] text-2xl">{initiales}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <Badge variant={agent.actif ? 'default' : 'secondary'} className="mb-2">
                  {agent.actif ? 'Actif' : 'Inactif'}
                </Badge>
                <h2 className="text-2xl font-bold text-gray-900">{agent.nom}</h2>
                <p className="text-lg text-gray-600">{agent.prenom}</p>
                <p className="text-sm text-gray-500">{agent.sexe === 'M' ? 'Homme' : 'Femme'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Pièce d'identité</p>
                <p>{agent.pieceIdentite?.type} {agent.pieceIdentite?.numero}</p>
                <p className="text-sm text-gray-600">
                  Délivrée: {formatAgentDate(agent.pieceIdentite?.dateDelivrance)} — Exp: {formatAgentDate(agent.pieceIdentite?.dateExpiration)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Naissance</p>
                <p>
                  Né le {formatAgentDate(agent.dateNaissance)} — {agent.lieuNaissance}
                </p>
                {age !== null && <p className="text-sm text-gray-600">{age} ans</p>}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Contacts</p>
                <p>📞 {agent.tel1}</p>
                {agent.tel2 && <p>📞 {agent.tel2}</p>}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Traçabilité</p>
                <p className="text-sm text-gray-600">
                  Créé le {formatAgentDate(agent.createdAt)} par {agent.createdBy}
                </p>
                <p className="text-sm text-gray-600">
                  Modifié le {formatAgentDate(agent.updatedAt)} {agent.updatedBy && `par ${agent.updatedBy}`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {agent && (
        <>
          <EditAgentModal agent={agent} open={editOpen} onOpenChange={setEditOpen} onSuccess={handleEditSuccess} mutation={updateMutation} />
          <DesactiverAgentModal agent={agent} open={desactiverOpen} onOpenChange={setDesactiverOpen} onSuccess={handleDesactiverSuccess} mutation={deactivateMutation} />
          <ReactiverAgentModal agent={agent} open={reactiverOpen} onOpenChange={setReactiverOpen} onSuccess={handleReactiverSuccess} mutation={reactivateMutation} />
          <SupprimerAgentModal agent={agent} open={supprimerOpen} onOpenChange={setSupprimerOpen} onSuccess={handleSupprimerSuccess} mutation={deleteMutation} />
        </>
      )}
    </div>
  )
}
