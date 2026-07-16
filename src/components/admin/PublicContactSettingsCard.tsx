'use client'

import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MessageCircle, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

/** Numéro par défaut si le réglage n'a jamais été enregistré. */
const DEFAULT_WHATSAPP = '+24174369729'
const SETTINGS_PATH = ['settings', 'publicContact'] as const

/** Normalise en format international +241… (garde le + initial, chiffres uniquement). */
function normalizeNumber(raw: string): string {
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^\d]/g, '')
  if (!digits) return ''
  return trimmed.startsWith('+') ? `+${digits}` : `+${digits}`
}

/**
 * Réglage du numéro WhatsApp public — visible par les membres (bulle, cartes)
 * ET par les invités (page d'accueil). Stocké dans `settings/publicContact`,
 * lu par l'app membre.
 */
export default function PublicContactSettingsCard() {
  const { user } = useAuth()
  const [memberNumber, setMemberNumber] = useState('')
  const [guestNumber, setGuestNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, ...SETTINGS_PATH))
        const data = snap.exists()
          ? (snap.data() as {
              memberWhatsappNumber?: string
              guestWhatsappNumber?: string
              whatsappNumber?: string
              phoneNumber?: string
            })
          : {}
        // Rétro-compatible avec les anciens champs whatsappNumber/phoneNumber.
        const member = data.memberWhatsappNumber || data.whatsappNumber || DEFAULT_WHATSAPP
        const guest = data.guestWhatsappNumber || data.phoneNumber || member
        if (!cancelled) {
          setMemberNumber(member)
          setGuestNumber(guest)
        }
      } catch {
        if (!cancelled) {
          setMemberNumber(DEFAULT_WHATSAPP)
          setGuestNumber(DEFAULT_WHATSAPP)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSave = async () => {
    const nMember = normalizeNumber(memberNumber)
    const nGuest = normalizeNumber(guestNumber)
    if (nMember.replace(/\D/g, '').length < 8 || nGuest.replace(/\D/g, '').length < 8) {
      toast.error('Numéro invalide')
      return
    }
    setSaving(true)
    try {
      await setDoc(
        doc(db, ...SETTINGS_PATH),
        {
          memberWhatsappNumber: nMember,
          guestWhatsappNumber: nGuest,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || 'admin',
        },
        { merge: true },
      )
      setMemberNumber(nMember)
      setGuestNumber(nGuest)
      toast.success('Numéros WhatsApp publics mis à jour')
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Coordonnées publiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Deux numéros <strong>WhatsApp</strong> distincts. Format international, ex.{' '}
          <span className="font-mono">+24174369729</span>.
        </p>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            WhatsApp — Membre <span className="text-gray-400">(bulle + accompagnement, une fois connecté)</span>
          </label>
          <Input
            value={loading ? '' : memberNumber}
            onChange={(e) => setMemberNumber(e.target.value)}
            placeholder={loading ? 'Chargement…' : '+24174369729'}
            disabled={loading || saving}
            className="max-w-xs font-mono"
            inputMode="tel"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            WhatsApp — Invité <span className="text-gray-400">(page d&apos;accueil : bulle + contact)</span>
          </label>
          <Input
            value={loading ? '' : guestNumber}
            onChange={(e) => setGuestNumber(e.target.value)}
            placeholder={loading ? 'Chargement…' : '+24174369729'}
            disabled={loading || saving}
            className="max-w-xs font-mono"
            inputMode="tel"
          />
        </div>

        <Button onClick={handleSave} disabled={loading || saving} className="bg-[#234D65] hover:bg-[#234D65]/90">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  )
}
