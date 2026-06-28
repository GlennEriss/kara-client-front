/**
 * Position GPS exacte (latitude/longitude) du membre.
 * - Affichage : coordonnées + aperçu carte + lien Google Maps.
 * - Capture : récupère la position de l'appareil de l'admin (sur place).
 * - Édition manuelle : saisie/correction des coordonnées (ou collage « lat, lng »).
 * Stocké sur le document users (champ gpsLocation).
 */

'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MapPin, Crosshair, ExternalLink, Loader2, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUser } from '@/db/user.db'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import type { MemberDetails } from '../../hooks/useMembershipDetails'

interface MemberLocationCaptureProps {
  member: MemberDetails
}

const isValidLat = (n: number) => Number.isFinite(n) && n >= -90 && n <= 90
const isValidLng = (n: number) => Number.isFinite(n) && n >= -180 && n <= 180

/** Aperçu carte sans clé API (OpenStreetMap embed) centré sur le point. */
function MapPreview({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.003
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`
  return (
    <iframe
      title="Position du membre"
      src={src}
      className="h-44 w-full rounded-xl border border-gray-200"
      loading="lazy"
    />
  )
}

export function MemberLocationCapture({ member }: MemberLocationCaptureProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [capturing, setCapturing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')

  const loc = member.gpsLocation

  const persist = async (latitude: number, longitude: number, accuracy?: number) => {
    const ok = await updateUser(member.id as string, {
      gpsLocation: { latitude, longitude, accuracy, capturedAt: new Date(), capturedBy: user?.uid ?? '' },
    })
    if (!ok) throw new Error('save failed')
    await queryClient.invalidateQueries({ queryKey: ['membership-details', 'member', member.id] })
  }

  const handleCapture = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('La géolocalisation n’est pas disponible sur cet appareil.')
      return
    }
    setCapturing(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords
          await persist(latitude, longitude, accuracy)
          toast.success('Position GPS enregistrée.')
          setEditing(false)
        } catch {
          toast.error("Impossible d'enregistrer la position.")
        } finally {
          setCapturing(false)
        }
      },
      (error) => {
        setCapturing(false)
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? 'Autorisation de localisation refusée.'
            : 'Impossible de récupérer la position.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  const startEdit = () => {
    setLatInput(loc ? String(loc.latitude) : '')
    setLngInput(loc ? String(loc.longitude) : '')
    setEditing(true)
  }

  /** Permet de coller « lat, lng » (ex. depuis Google Maps) dans le champ latitude. */
  const onLatChange = (v: string) => {
    if (v.includes(',')) {
      const [a, b] = v.split(',')
      setLatInput(a.trim())
      if (b !== undefined) setLngInput(b.trim())
      return
    }
    setLatInput(v)
  }

  const handleSaveManual = async () => {
    const lat = Number(latInput.trim())
    const lng = Number(lngInput.trim())
    if (!isValidLat(lat) || !isValidLng(lng)) {
      toast.error('Coordonnées invalides (latitude −90..90, longitude −180..180).')
      return
    }
    setSaving(true)
    try {
      await persist(lat, lng)
      toast.success('Position enregistrée.')
      setEditing(false)
    } catch {
      toast.error("Impossible d'enregistrer la position.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-rose-600" /> Position GPS
        </span>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCapture}
              disabled={capturing}
              className="h-8"
              data-testid="member-capture-gps-button"
            >
              {capturing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Crosshair className="mr-1 h-3.5 w-3.5" />}
              {loc ? 'Recapturer' : 'Capturer'}
            </Button>
            <Button size="sm" variant="ghost" onClick={startEdit} className="h-8" data-testid="member-edit-gps-button">
              <Pencil className="mr-1 h-3.5 w-3.5" /> {loc ? 'Modifier' : 'Saisir'}
            </Button>
          </div>
        )}
      </div>

      {/* Mode édition manuelle */}
      {editing ? (
        <div className="space-y-3 rounded-xl bg-gray-50 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gps-lat" className="text-xs text-gray-500">Latitude</Label>
              <Input
                id="gps-lat"
                value={latInput}
                onChange={(e) => onLatChange(e.target.value)}
                placeholder="0.412345 (ou « lat, lng »)"
                className="h-9 font-mono"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gps-lng" className="text-xs text-gray-500">Longitude</Label>
              <Input
                id="gps-lng"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="9.467890"
                className="h-9 font-mono"
                inputMode="decimal"
              />
            </div>
          </div>
          <p className="text-[11px] text-gray-400">
            Astuce : copiez les coordonnées depuis Google Maps et collez-les dans le champ Latitude.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSaveManual} disabled={saving} className="h-8 bg-[#234D65] hover:bg-[#1A3D4F]">
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="h-8">
              <X className="mr-1 h-3.5 w-3.5" /> Annuler
            </Button>
          </div>
        </div>
      ) : loc ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-mono text-gray-800">
              {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
            </span>
            {typeof loc.accuracy === 'number' && (
              <span className="text-xs text-gray-400">±{Math.round(loc.accuracy)} m</span>
            )}
            <a
              href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#234D65] hover:underline"
            >
              Google Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <MapPreview lat={loc.latitude} lng={loc.longitude} />
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          Aucune position enregistrée. « Capturer » depuis le domicile du membre, ou « Saisir » manuellement.
        </p>
      )}
    </div>
  )
}
