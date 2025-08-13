"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { Group, User } from '@/types/types'
import { listGroups } from '@/db/group.db'
import { useMembers } from '@/hooks/useMembers'
import { toast } from 'sonner'
import { updateUser } from '@/db/user.db'
import { removeMemberFromGroup } from '@/db/member.db'
import { updateGroup } from '@/db/group.db'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props { groupId: string }

export default function GroupDetails({ groupId }: Props) {
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
        toast.error('Erreur chargement groupe')
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

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{group?.name || 'Groupe'}</span>
              {group?.label && <Badge>{group.label}</Badge>}
            </div>
            <div className="text-sm text-gray-500">Créé le {group?.createdAt && !isNaN(new Date(group.createdAt as any).getTime()) ? new Date(group.createdAt as any).toLocaleDateString('fr-FR') : '—'}</div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-gray-700">{group?.description || 'Aucune description'}</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md"><CardContent className="p-4"><div className="text-sm text-gray-600">Membres du groupe</div><div className="text-2xl font-bold">{groupMembers.length}</div></CardContent></Card>
        <Card className="border-0 shadow-md"><CardContent className="p-4"><div className="text-sm text-gray-600">Recherche</div><div className="text-2xl font-bold">{filteredMembers.length}</div></CardContent></Card>
        <Card className="border-0 shadow-md"><CardContent className="p-4"><div className="text-sm text-gray-600">Total membres (chargés)</div><div className="text-2xl font-bold">{members.length}</div></CardContent></Card>
      </div>

      {/* Actions */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Input placeholder="Rechercher un membre (nom, email, matricule)" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 w-80" />
              <Button variant="outline" onClick={() => refetch()} className="h-11"><RefreshCw className="w-4 h-4 mr-2" /> Actualiser</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button className="h-11 bg-[#234D65] hover:bg-[#234D65] text-white" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Ajouter un membre</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((m) => (
          <Card key={m.id} className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="font-semibold">{m.firstName} {m.lastName}</div>
              <div className="text-sm text-gray-600">{m.matricule}</div>
              <div className="text-sm text-gray-600">{m.email || '—'}</div>
              <div className="mt-2 flex items-center justify-between">
                <Badge>Groupe</Badge>
                <Button variant="destructive" size="sm" onClick={() => setToRemove(m)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Retirer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredMembers.length === 0 && (
          <Card className="border-0 shadow-md"><CardContent className="p-6 text-center text-gray-600">Aucun membre trouvé</CardContent></Card>
        )}
      </div>

      {/* Modal ajout de membre */}
      <AddMemberDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        groupId={groupId}
        allMembers={members}
        onAdded={async () => { await refetch(); toast.success('Membre ajouté au groupe') }}
      />

      {/* Confirmation suppression membre du groupe */}
      <Dialog open={!!toRemove} onOpenChange={(open) => { if (!isRemoving && !open) setToRemove(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer le membre du groupe</DialogTitle>
            <DialogDescription>Cette action retirera ce membre de ce groupe. Continuer ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToRemove(null)} disabled={isRemoving}>Annuler</Button>
            <Button variant="destructive" onClick={async () => {
              if (!toRemove) return
              try {
                setIsRemoving(true)
                const ok = await removeMemberFromGroup(toRemove.id, 'system')
                if (!ok) throw new Error('fail')
                // Mettre à jour le groupe (updatedAt/updatedBy)
                await updateGroup(groupId, { updatedBy: 'system' })
                await refetch()
                toast.success('Membre retiré du groupe')
                setToRemove(null)
              } catch {
                toast.error('Impossible de retirer ce membre')
              } finally {
                setIsRemoving(false)
              }
            }} disabled={isRemoving}>{isRemoving ? 'Retrait...' : 'Retirer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddMemberDialog({ open, onClose, groupId, allMembers, onAdded }: { open: boolean; onClose: () => void; groupId: string; allMembers: User[]; onAdded: () => Promise<void> }) {
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
      toast.error('Impossible d\'ajouter ce membre')
    } finally {
      setAdding((s) => ({ ...s, [userId]: false }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!Object.values(adding).some(Boolean)) onClose() }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ajouter un membre au groupe</DialogTitle>
          <DialogDescription>Sélectionnez un membre sans groupe et ajoutez-le à ce groupe</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Rechercher (nom, matricule, email)" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-[60vh] overflow-auto space-y-2">
            {candidates.length === 0 && <div className="text-sm text-gray-600">Aucun membre disponible</div>}
            {candidates.map((m) => (
              <div key={m.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="font-medium">{m.firstName} {m.lastName}</div>
                  <div className="text-xs text-gray-600">{m.matricule} • {m.email || '—'}</div>
                </div>
                <Button size="sm" className="bg-[#234D65] hover:bg-[#234D65] text-white" onClick={() => handleAdd(m.id)} disabled={!!adding[m.id]}>
                  {adding[m.id] ? 'Ajout...' : 'Ajouter'}
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={Object.values(adding).some(Boolean)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

