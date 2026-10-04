'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import { auth } from '@/firebase/auth'
import { db } from '@/firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore'
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const MIN_LENGTH = 8

/** Même règle que l'espace membre (vérifiée aussi côté serveur). */
function validate(pwd: string): string | null {
  if (pwd.length < MIN_LENGTH) return `Au moins ${MIN_LENGTH} caractères`
  if (!/[a-zA-Z]/.test(pwd)) return 'Au moins une lettre'
  if (!/[0-9]/.test(pwd)) return 'Au moins un chiffre'
  return null
}

/** Drapeau `mustChangePassword` de la fiche `admins` : par uid (= matricule), sinon par email. */
async function mustChangePassword(uid: string, email: string | null): Promise<boolean> {
  const byId = await getDoc(doc(db, 'admins', uid))
  if (byId.exists()) return byId.data()?.mustChangePassword === true
  if (!email) return false
  const snap = await getDocs(query(collection(db, 'admins'), where('email', '==', email), limit(1)))
  return !snap.empty && snap.docs[0].data()?.mustChangePassword === true
}

/**
 * Oblige l'administrateur à choisir son mot de passe à la première connexion,
 * ou après une réinitialisation : le mot de passe remis par le SuperAdmin n'est
 * que temporaire. Même fonctionnement que l'espace membre (ForcePasswordChangeGate).
 */
export function AdminPasswordChangeGate() {
  const { user, loading } = useAuth()
  const [needsChange, setNeedsChange] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (loading || !user?.uid) return
    mustChangePassword(user.uid, user.email)
      .then((flag) => {
        if (!cancelled) setNeedsChange(flag)
      })
      .catch(() => {
        // Lecture impossible : on ne bloque pas l'accès.
      })
    return () => {
      cancelled = true
    }
  }, [user?.uid, user?.email, loading])

  const handleSubmit = async () => {
    const error = validate(password)
    if (error) {
      toast.error(error)
      return
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/auth/admin/change-initial-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: password }),
      })
      if (!response.ok) throw new Error('request failed')

      // Reconnexion avec le nouveau mot de passe pour renouveler la session serveur.
      if (user?.email) {
        const cred = await signInWithEmailAndPassword(auth, user.email, password)
        const idToken = await cred.user.getIdToken(true)
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
      }

      toast.success('Mot de passe enregistré')
      setNeedsChange(false)
      setPassword('')
      setConfirm('')
    } catch {
      toast.error('Échec de la mise à jour du mot de passe')
    } finally {
      setSaving(false)
    }
  }

  if (!needsChange) return null

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="[&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#234D65]" />
            Définissez votre mot de passe
          </DialogTitle>
          <DialogDescription>
            Pour votre sécurité, choisissez un mot de passe personnel avant d&apos;accéder à l&apos;espace
            d&apos;administration. Il remplacera le mot de passe temporaire qui vous a été remis.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!saving) handleSubmit()
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="admin-new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="admin-new-password"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={show ? 'Masquer' : 'Afficher'}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Au moins 8 caractères, dont une lettre et un chiffre.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="admin-confirm-password">Confirmer le mot de passe</Label>
            <Input
              id="admin-confirm-password"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full bg-[#234D65] hover:bg-[#1a3a4d]" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer mon mot de passe
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
