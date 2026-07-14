"use client"

import { Button } from '@/components/ui/button'
import { auth } from '@/firebase/auth'
import { useAuth } from '@/hooks/useAuth'
import { useMyAccess } from '@/hooks/useMyAccess'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

/** Compte autorisé à s'auto-promouvoir SuperAdmin (amorçage unique). */
const BOOTSTRAP_EMAIL = 'phil@gmail.com'

/**
 * Bouton d'amorçage visible UNIQUEMENT par le compte d'amorçage tant qu'il
 * n'est pas SuperAdmin. Résout le blocage « aucun SuperAdmin ne peut promouvoir ».
 * La promotion est appliquée côté serveur (route sécurisée par l'email).
 */
export default function BootstrapSuperAdminButton() {
  const { user } = useAuth()
  const { isSuperAdmin, isLoading } = useMyAccess()
  const [promoting, setPromoting] = useState(false)

  const email = (user?.email || '').toLowerCase()
  if (isLoading || email !== BOOTSTRAP_EMAIL || isSuperAdmin) return null

  const handlePromote = async () => {
    setPromoting(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      try {
        const token = await auth.currentUser?.getIdToken()
        if (token) headers.Authorization = `Bearer ${token}`
      } catch {
        // on s'appuie sur le cookie de session
      }
      const res = await fetch('/api/admin/bootstrap-superadmin', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(d?.error || res.statusText)
      }
      toast.success('Vous êtes maintenant SuperAdmin. Rechargement…')
      setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la promotion')
      setPromoting(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handlePromote}
      disabled={promoting}
      className="h-8 shrink-0 bg-purple-600 text-white hover:bg-purple-700"
      title="Devenir SuperAdmin"
    >
      {promoting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
      Devenir SuperAdmin
    </Button>
  )
}
