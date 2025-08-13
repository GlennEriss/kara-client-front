"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, RefreshCw, Eye } from 'lucide-react'
import type { Group } from '@/types/types'
import { createGroup, deleteGroup, listGroups, updateGroup } from '@/db/group.db'
import { toast } from 'sonner'
import Link from 'next/link'
import routes from '@/constantes/routes'
import { countMembersByGroup } from '@/db/member.db'

export default function GroupList() {
  const [groups, setGroups] = React.useState<Group[]>([])
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    ;(async () => {
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
    toast.success('Groupes actualisés')
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Nom requis')
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
      toast.success('Groupe créé')
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
      toast.success('Groupe modifié')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    try {
      setIsDeleting(true)
      // Vérifier s'il y a des membres dans ce groupe
      const count = await countMembersByGroup(toDelete.id)
      if (count > 0) {
        toast.error("Impossible de supprimer le groupe", { description: `Ce groupe contient ${count} membre(s).` })
        return
      }
      await deleteGroup(toDelete.id)
      setGroups((prev) => prev.filter((g) => g.id !== toDelete.id))
      setToDelete(null)
      toast.success('Groupe supprimé')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un groupe..." className="pl-3 h-11" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} className="h-11">
                <RefreshCw className="w-4 h-4 mr-2" /> Rafraîchir
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="h-11 bg-[#234D65] hover:bg-[#234D65] text-white">
                <Plus className="w-4 h-4 mr-2" /> Nouveau Groupe
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats simples */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md"><CardContent className="p-4 flex items-center justify-between"><div><div className="text-sm text-gray-600">Total Groupes</div><div className="text-2xl font-bold">{groups.length}</div></div><Users className="w-6 h-6 text-[#234D65]" /></CardContent></Card>
        <Card className="border-0 shadow-md"><CardContent className="p-4"><div className="text-sm text-gray-600">Avec libellé</div><div className="text-2xl font-bold">{groups.filter(g=>g.label).length}</div></CardContent></Card>
        <Card className="border-0 shadow-md"><CardContent className="p-4"><div className="text-sm text-gray-600">Sans libellé</div><div className="text-2xl font-bold">{groups.filter(g=>!g.label).length}</div></CardContent></Card>
      </div>

      {/* Liste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((g) => (
          <Card key={g.id} className="border-0 shadow-md hover:shadow-lg transition">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{g.name}</span>
                <div className="flex items-center gap-2">
                  {g.label && <Badge>{g.label}</Badge>}
                  <Link href={routes.admin.groupDetails(g.id)} className="inline-flex"><Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Détails</Button></Link>
                  <Button variant="outline" size="sm" onClick={() => openEdit(g)}>Modifier</Button>
                  <Button variant="destructive" size="sm" onClick={async () => {
                    // Désactiver directement si des membres sont rattachés
                    const count = await countMembersByGroup(g.id)
                    if (count > 0) {
                      toast.error('Suppression impossible', { description: 'Ce groupe contient des membres.' })
                      return
                    }
                    setToDelete(g)
                  }}>Supprimer</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 min-h-[40px]">{g.description || '—'}</p>
              <div className="text-xs text-gray-500 mt-2">Créé le {new Date(g.createdAt).toLocaleDateString('fr-FR')}</div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="border-0 shadow-md"><CardContent className="p-6 text-center text-gray-600">Aucun groupe</CardContent></Card>
        )}
      </div>

      {/* Modal création */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Groupe</DialogTitle>
            <DialogDescription>Définissez un nom, un libellé et une description</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nom</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Groupe A" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Libellé</label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optionnel" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>Annuler</Button>
            <Button onClick={handleCreate} disabled={isSubmitting} className="bg-[#234D65] hover:bg-[#234D65] text-white">
              {isSubmitting ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal édition */}
      <Dialog open={!!toEdit} onOpenChange={(open) => !isUpdating && !open && setToEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nom</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Libellé</label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToEdit(null)} disabled={isUpdating}>Annuler</Button>
            <Button onClick={handleUpdate} disabled={isUpdating} className="bg-[#234D65] hover:bg-[#234D65] text-white">{isUpdating ? 'Modification...' : 'Modifier'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation suppression */}
      <Dialog open={!!toDelete} onOpenChange={(open) => !isDeleting && !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={isDeleting}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>{isDeleting ? 'Suppression...' : 'Supprimer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

