'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Car, ChevronLeft, ChevronRight, Phone, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  vehicleCalendarDays,
  vehicleWebDestination,
  vehicleWhatsAppNumber,
  type VehicleCalendarItem,
} from '@/domains/vehicles/calendar-model'
import { gabonDay } from '@/domains/insurance-prospects/model'
const fmt = (day: string) =>
  new Date(day + 'T12:00:00Z').toLocaleDateString('fr-FR', {
    timeZone: 'Africa/Libreville',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
export function CalendarViewVehicles({
  month,
  onMonthChange,
}: {
  month: Date
  onMonthChange: (date: Date) => void
}) {
  const monthKey = gabonDay(month).slice(0, 7),
    [source, setSource] = useState(''),
    [phase, setPhase] = useState(''),
    [search, setSearch] = useState(''),
    [quarter, setQuarter] = useState(''),
    [day, setDay] = useState<string | null>(null)
  const q = useQuery<{ items: VehicleCalendarItem[] }>({
    queryKey: ['calendar-vehicles', monthKey],
    queryFn: async () => {
      const r = await fetch(`/api/calendar/vehicles?month=${monthKey}`, {
        cache: 'no-store',
      })
      const data = await r.json()
      if (!r.ok) throw Error(data.error || 'Chargement impossible.')
      return data
    },
  })
  const items = (q.data?.items || []).filter(
    (r) =>
      (!source || r.source === source) &&
      (!phase || r.phase === phase) &&
      (!quarter || r.quarterId === quarter) &&
      (!search ||
        [r.ownerName, r.plateNumber, r.insuranceCompany, r.quarter, r.city]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())),
  )
  const quarters = [
    ...new Map(
      (q.data?.items || [])
        .filter((r) => r.quarterId)
        .map((r) => [r.quarterId, r.quarter]),
    ).entries(),
  ]
  const changeMonth = (by: number) => {
    const d = new Date(`${monthKey}-01T12:00:00`)
    d.setMonth(d.getMonth() + by)
    onMonthChange(d)
  }
  const record = (r: VehicleCalendarItem) => (
    <article
      key={r.id}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#234D65]">
            {r.plateNumber || 'Véhicule sans plaque'}
          </p>
          <p className="text-sm text-slate-600">{r.ownerName}</p>
        </div>
        <Badge variant={r.phase === 'expired' ? 'destructive' : 'secondary'}>
          {r.phaseLabel}
        </Badge>
      </div>
      <p className="text-sm">
        {r.source === 'insurance' ? 'Assurance LE KARA' : 'Prospection'} ·{' '}
        {r.insuranceCompany}
      </p>
      <p className="text-sm text-slate-600">
        Fin d’assurance : <strong>{fmt(r.date)}</strong>
      </p>
      <p className="text-sm text-slate-600">
        {[r.quarter || r.locationDetails, r.city].filter(Boolean).join(' · ') ||
          'Localisation non renseignée'}
      </p>
      {r.sponsorName && (
        <p className="text-sm text-slate-600">Parrain : {r.sponsorName}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={vehicleWebDestination(r)}>Ouvrir le dossier</Link>
        </Button>
        {vehicleWhatsAppNumber(r.phone) && (
          <Button asChild variant="outline">
            <a href={`tel:${'+' + vehicleWhatsAppNumber(r.phone)}`}>
              <Phone className="mr-2 h-4 w-4" />
              Appeler
            </a>
          </Button>
        )}
        {vehicleWhatsAppNumber(r.whatsapp) && (
          <Button asChild variant="outline">
            <a
              href={`https://wa.me/${vehicleWhatsAppNumber(r.whatsapp)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </Button>
        )}
      </div>
    </article>
  )
  return (
    <section className="space-y-5" data-testid="vehicle-calendar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-[#234D65]">
            <Car className="h-5 w-5" />
            Échéances des véhicules
          </h2>
          <p className="text-sm text-slate-500">
            Assurances validées et prospects encore à suivre, selon leur date de
            fin d’assurance.
          </p>
        </div>
        <Button variant="outline" onClick={() => void q.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>
      <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          aria-label="Rechercher un véhicule"
          placeholder="Plaque, titulaire, quartier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Origine du dossier"
          className="rounded-lg border bg-white p-2 text-sm"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Assurances et prospects</option>
          <option value="insurance">Assurances LE KARA</option>
          <option value="prospects">Prospection</option>
        </select>
        <select
          aria-label="État de l’échéance"
          className="rounded-lg border bg-white p-2 text-sm"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
        >
          <option value="">Tous les états</option>
          <option value="expired">Échéance dépassée</option>
          <option value="today">Expire aujourd’hui</option>
          <option value="soon">Expire bientôt</option>
          <option value="future">À venir</option>
        </select>
        <select
          aria-label="Quartier du véhicule"
          className="rounded-lg border bg-white p-2 text-sm"
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
        >
          <option value="">Tous les quartiers</option>
          {quarters.map(([id, name]) => (
            <option key={id} value={id}>
              {name || 'Quartier sans libellé'}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          aria-label="Mois précédent des véhicules"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft />
        </Button>
        <h3 className="font-semibold capitalize">
          {month.toLocaleDateString('fr-FR', {
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <Button
          variant="outline"
          aria-label="Mois suivant des véhicules"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      {q.isPending ? (
        <p role="status">Chargement des échéances…</p>
      ) : q.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 p-4 text-red-700"
        >
          {q.error.message}
          <Button
            variant="outline"
            className="ml-3"
            onClick={() => void q.refetch()}
          >
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <p
                key={d}
                className="py-2 text-center text-xs font-medium text-slate-500"
              >
                {d}
              </p>
            ))}
            {vehicleCalendarDays(monthKey).map((date, index) => {
              const rows = items.filter((r) => r.date === date),
                expired = rows.some((r) => r.phase === 'expired')
              return date ? (
                <button
                  key={date}
                  aria-label={`${fmt(date)} : ${rows.length} échéance(s) de véhicule`}
                  onClick={() => setDay(date)}
                  className={`min-h-20 rounded-xl border p-2 text-left transition-colors hover:border-[#234D65] ${expired ? 'border-red-200 bg-red-50' : rows.length ? 'border-blue-200 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <span className="block text-sm font-semibold">
                    {Number(date.slice(-2))}
                  </span>
                  {rows.length > 0 && (
                    <span className="mt-1 block text-xs text-[#234D65]">
                      {rows.length} véhicule{rows.length > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ) : (
                <div key={`empty-${index}`} />
              )
            })}
          </div>
          <p className="text-sm text-slate-500">
            {items.length} échéance(s) · Touchez un jour pour consulter les
            dossiers.
          </p>
          {!items.length && (
            <p className="rounded-xl border border-dashed p-6 text-center text-slate-500">
              Aucune échéance de véhicule pour cette sélection.
            </p>
          )}
          <div className="grid gap-3 lg:grid-cols-2">{items.map(record)}</div>
        </>
      )}
      <Dialog
        open={!!day}
        onOpenChange={(open) => {
          if (!open) setDay(null)
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Véhicules du {day ? fmt(day) : ''}</DialogTitle>
            <DialogDescription>
              Fin d’assurance, contact et accès au dossier véhicule.
            </DialogDescription>
          </DialogHeader>
          {items.filter((r) => r.date === day).map(record)}
          {!items.some((r) => r.date === day) && (
            <p className="text-slate-500">Aucun dossier pour ce jour.</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
