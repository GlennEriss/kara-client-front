'use client'

/**
 * Modale de migration de l'UID d'un compte admin (Auth + Firestore).
 * L'UID Auth étant immuable, le compte est recréé avec le nouvel UID, le même
 * email et le mot de passe saisi (conservé). Confirmation par recopie de l'UID.
 */

import { useState } from 'react'
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { useLogout } from '@/domains/auth/hooks/useLogout'
import { changeAdminUid } from './excelImportWriter'

interface ChangeAdminUidModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultNewUid?: string
}

export function ChangeAdminUidModal({
  open,
  onOpenChange,
  defaultNewUid = '0001.MK.290626',
}: ChangeAdminUidModalProps) {
  const [email, setEmail] = useState('')
  const [newUid, setNewUid] = useState(defaultNewUid)
  const [password, setPassword] = useState('')
  const [confirmUid, setConfirmUid] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { logout } = useLogout()

  const isConfirmValid = confirmUid.trim() === newUid.trim() && newUid.trim().length > 0
  const canSubmit = email.trim() && password.length >= 6 && isConfirmValid && !loading

  const reset = () => {
    setEmail('')
    setNewUid(defaultNewUid)
    setPassword('')
    setConfirmUid('')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await changeAdminUid({
        email: email.trim(),
        newUid: newUid.trim(),
        password,
      })
      // Si on a migré le compte actuellement connecté, sa session pointe vers un
      // UID supprimé → on déconnecte + redirige vers la connexion.
      const isSelf = (user?.email || '').trim().toLowerCase() === res.email.trim().toLowerCase()
      if (isSelf) {
        toast.success('UID migré — reconnecte-toi', {
          description: `${res.oldUid} → ${res.newUid}. Connecte-toi avec le même email et mot de passe.`,
        })
        await logout()
        return
      }
      toast.success('UID admin migré', {
        description: `${res.oldUid} → ${res.newUid} (${res.migratedDocs.join(', ') || 'aucun document'})`,
      })
      reset()
      onOpenChange(false)
    } catch (e) {
      toast.error("Échec de la migration", {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (loading ? null : onOpenChange(o))}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => loading && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            <KeyRound /> Migrer l&apos;UID d&apos;un admin
          </DialogTitle>
          <DialogDescription>
            L&apos;UID Firebase Auth est immuable : le compte est recréé avec le nouvel
            UID, le même email et le mot de passe saisi (conservé), puis l&apos;ancien est
            supprimé. Les documents Firestore (admins/users) sont migrés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Opération sensible et irréversible. Si tu migres ton propre compte, tu
              seras déconnecté et devras te reconnecter avec le même email et mot de passe.
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">Email du compte admin</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemple.com"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-new-uid">Nouvel UID</Label>
            <Input
              id="admin-new-uid"
              value={newUid}
              onChange={(e) => setNewUid(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Mot de passe actuel du compte</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
            />
            <p className="text-[11px] text-gray-400">
              Le compte sera recréé avec ce mot de passe (min. 6 caractères).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-confirm-uid">
              Recopiez le nouvel UID pour confirmer
            </Label>
            <Input
              id="admin-confirm-uid"
              value={confirmUid}
              onChange={(e) => setConfirmUid(e.target.value)}
              placeholder={newUid}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[#234D65] text-white hover:bg-[#1A3D4F]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Migration…
              </>
            ) : (
              'Migrer l’UID'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
