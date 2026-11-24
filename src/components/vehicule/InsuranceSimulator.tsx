'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowDown, ArrowLeft, Calculator, CalendarDays, CarFront, ChevronDown, Coins,
  FileText, Gauge, HandCoins, Info, LoaderCircle, Package, RotateCcw, ShieldCheck, Users, Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHero } from '@/components/ui/page-hero'
import { Switch } from '@/components/ui/switch'
import type { OgarTariffGroup } from '@/domains/vehicles/server/ogar-tariff'
import { insuranceAssetOptions } from '@/domains/vehicles/asset-types'
import { useInsuranceAssetTypes } from '@/domains/vehicles/use-insurance-asset-types'
import { useInsurancePartners } from '@/hooks/vehicule/useVehicleRewards'
import { computeVehicleReward, normalizeInsurerName } from '@/utils/vehicle-rewards'

const percent = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const ogarVehicleTypes = new Set(['car', 'van', 'motorcycle', 'bus', 'truck', 'machinery'])
const ogarOption = '__ogar__'
const otherPartnerOption = '__other_partner__'
const isOgarName = (name?: string) => /^(ogar)(?: |$)/.test(normalizeInsurerName(name))
const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const nativeSelect = 'h-12 w-full min-w-0 appearance-none truncate rounded-xl border border-input bg-background pl-3 pr-9 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-60 md:text-sm'
const reveal = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300'
const panel = 'min-w-0 rounded-2xl border border-border bg-card shadow-sm'

function SelectField({ children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative min-w-0">
      <select className={nativeSelect} {...props}>{children}</select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export function InsuranceSimulator() {
  const assetCatalog = useInsuranceAssetTypes()
  const partners = useInsurancePartners()
  const assetSelect = useRef<HTMLSelectElement>(null)
  const [assetType, setAssetType] = useState('')
  const [customAsset, setCustomAsset] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [customPartner, setCustomPartner] = useState('')
  const [premium, setPremium] = useState('')
  const [hasSponsor, setHasSponsor] = useState(true)
  const [manualOverride, setManualOverride] = useState(false)
  const [groupId, setGroupId] = useState('')
  const [band, setBand] = useState('')
  const [plan, setPlan] = useState('')

  const partner = partners.data?.find(item => item.id === partnerId)
  const isOgar = partnerId === ogarOption || isOgarName(partner?.name)
  const eligibleForOgar = isOgar && ogarVehicleTypes.has(assetType)
  const source = useQuery({
    queryKey: ['insurance-tariff-simulation', 'ogar'],
    enabled: eligibleForOgar,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/vehicules/baremes?simulation=ogar', { signal, cache: 'no-store' })
      if (!response.ok) throw Error('Barème indisponible')
      return await response.json() as { gridId?: string; title?: string; groups: OgarTariffGroup[] }
    },
  })
  const gridId = source.data?.gridId
  const groups = source.data?.groups.filter(group => group.assetTypes.includes(assetType)) ?? []
  const verified = eligibleForOgar && !!gridId && groups.length > 0 && !source.isError && !source.isFetching
  const automatic = verified && !manualOverride
  const group = groups.find(item => item.id === groupId) ?? (groups.length === 1 ? groups[0] : undefined)
  const bandIndex = group?.bands.length === 1 ? 0 : band === '' ? -1 : Number(band)
  const planIndex = group?.plans.length === 1 ? 0 : plan === '' ? -1 : Number(plan)
  const tariffAmount = group?.bands[bandIndex]?.rates[planIndex]
  const normalizedPremium = premium.replace(/\s/g, '')
  const manualAmount = /^\d+$/.test(normalizedPremium) ? Number(normalizedPremium) : 0
  const amount = automatic ? tariffAmount ?? 0 : manualAmount
  const validAmount = Number.isSafeInteger(amount) && amount > 0
  const hasAsset = !!assetType && (assetType !== 'other' || !!customAsset.trim())
  const hasPartner = !!partnerId && (partnerId !== otherPartnerOption || !!customPartner.trim())
  const rates = partner && {
    commissionRate: partner.commissionRate,
    memberSharePercent: hasSponsor ? partner.memberSharePercent : 0,
  }
  const awaitingTariff = eligibleForOgar && (source.isPending || source.isFetching) && !manualOverride
  const ready = hasAsset && hasPartner && validAmount && !awaitingTariff
  const result = ready && rates ? computeVehicleReward(amount, rates) : null
  const karaAmount = result ? result.expectedCommission - result.memberAmount : null
  const sponsorPercent = result && result.expectedCommission > 0
    ? (result.memberAmount / result.expectedCommission) * 100
    : 0
  const premiumLabel = automatic ? 'Prime à payer selon le barème' : 'Prime à payer selon le devis'

  let nextField = 'Saisissez la prime du devis.'
  if (automatic) nextField = 'Complétez les caractéristiques du véhicule.'
  if (awaitingTariff) nextField = 'Vérification du barème OGAR…'
  if (!hasPartner || !hasAsset) nextField = 'Choisissez le bien à assurer et son assureur.'

  function resetPricing() {
    setPremium('')
    setGroupId('')
    setBand('')
    setPlan('')
    setManualOverride(false)
  }

  function startOver() {
    setAssetType('')
    setCustomAsset('')
    setPartnerId('')
    setCustomPartner('')
    setHasSponsor(true)
    resetPricing()
    assetSelect.current?.focus()
  }

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-3 sm:space-y-6 sm:p-6">
      <PageHero icon={Calculator} title="Simulateur d’assurance"
        subtitle="Calculez la prime et estimez ce que l’assurance rapporte à LE KARA et au parrain."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="min-h-10 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/vehicules"><ArrowLeft aria-hidden className="size-4" /> Assurances et prospections</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-10 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/vehicules/baremes"><FileText aria-hidden className="size-4" /> Barèmes des assureurs</Link>
            </Button>
          </div>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="simulation-bien" className={`${panel} @container space-y-5 p-4 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary dark:text-kara-primary-light">
                <ShieldCheck aria-hidden className="size-5" />
              </span>
              <h2 id="simulation-bien" className="font-semibold tracking-tight sm:text-lg">Votre simulation</h2>
            </div>
            {(assetType || partnerId) && (
              <Button type="button" variant="ghost" size="sm" aria-label="Réinitialiser" title="Réinitialiser"
                className="min-h-11 min-w-11 text-muted-foreground" onClick={startOver}>
                <RotateCcw aria-hidden className="size-4" /> <span className="hidden sm:inline">Réinitialiser</span>
              </Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="simulation-type"><Package aria-hidden className="size-4 text-muted-foreground" /> Type de bien</Label>
              <SelectField ref={assetSelect} id="simulation-type" value={assetType}
                onChange={event => { setAssetType(event.target.value); resetPricing() }}>
                <option value="">Choisir un type de bien</option>
                {insuranceAssetOptions(assetCatalog.data).map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </SelectField>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="simulation-partner"><ShieldCheck aria-hidden className="size-4 text-muted-foreground" /> Assureur</Label>
              <SelectField id="simulation-partner" value={partnerId}
                onChange={event => { setPartnerId(event.target.value); resetPricing() }} disabled={partners.isPending}>
                <option value="">Choisir un assureur</option>
                {!(partners.data ?? []).some(item => isOgarName(item.name)) && <option value={ogarOption}>OGAR</option>}
                {(partners.data ?? []).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                <option value={otherPartnerOption}>Autre assureur</option>
              </SelectField>
            </div>
          </div>
          {assetType === 'other' && (
            <div className={`${reveal} space-y-2`}>
              <Label htmlFor="simulation-custom-type">Description du bien</Label>
              <Input id="simulation-custom-type" className="h-12 rounded-xl" value={customAsset} maxLength={150}
                onChange={event => setCustomAsset(event.target.value)} />
            </div>
          )}
          {partnerId === otherPartnerOption && (
            <div className={`${reveal} space-y-2`}>
              <Label htmlFor="simulation-other-partner">Nom de l’assureur</Label>
              <Input id="simulation-other-partner" className="h-12 rounded-xl" value={customPartner}
                onChange={event => setCustomPartner(event.target.value)} maxLength={60} />
            </div>
          )}
          {partners.isError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              Les taux des assureurs sont indisponibles.
              <Button size="sm" variant="outline" onClick={() => void partners.refetch()}>Réessayer</Button>
            </div>
          )}
          {awaitingTariff && (
            <p className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm" role="status">
              <LoaderCircle aria-hidden className="size-4 shrink-0 motion-safe:animate-spin" />
              Vérification du barème OGAR…
            </p>
          )}
          {eligibleForOgar && !awaitingTariff && !verified && (
            <p className="flex items-start gap-2 rounded-xl border border-secondary/40 bg-secondary/10 p-4 text-sm">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              Le calcul automatique est indisponible pour le barème OGAR en vigueur. Saisissez la prime du devis ou du barème.
            </p>
          )}
          {verified && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileText aria-hidden className="size-4 text-muted-foreground" /> {source.data?.title ?? 'Barème OGAR'}
              </p>
              <Button type="button" variant="outline" size="sm" className="min-h-10"
                onClick={() => setManualOverride(!manualOverride)}>
                {manualOverride ? 'Utiliser le barème' : 'Saisir la prime du devis'}
              </Button>
            </div>
          )}
          {automatic ? (
            <div className={`${reveal} space-y-4 rounded-xl border bg-muted/45 p-3 sm:p-4`}>
              <div className="space-y-2">
                <Label htmlFor="ogar-group"><CarFront aria-hidden className="size-4 text-muted-foreground" /> Catégorie du véhicule</Label>
                <SelectField id="ogar-group" value={group?.id ?? ''} onChange={event => {
                  setGroupId(event.target.value)
                  setBand('')
                  setPlan('')
                }}>
                  {groups.length > 1 && <option value="">Choisir une catégorie</option>}
                  {groups.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </SelectField>
              </div>
              {group && (
                <div className={`${reveal} grid gap-3 @min-[520px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]`}>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="ogar-band"><Gauge aria-hidden className="size-4 text-muted-foreground" /> Énergie et puissance</Label>
                    <SelectField id="ogar-band" value={bandIndex < 0 ? '' : bandIndex} onChange={event => setBand(event.target.value)}>
                      {group.bands.length > 1 && <option value="">Choisir la puissance</option>}
                      {group.bands.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}
                    </SelectField>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="ogar-plan"><CalendarDays aria-hidden className="size-4 text-muted-foreground" /> Durée et bonus</Label>
                    <SelectField id="ogar-plan" value={planIndex < 0 ? '' : planIndex} onChange={event => setPlan(event.target.value)}>
                      {group.plans.length > 1 && <option value="">Choisir la durée</option>}
                      {group.plans.map((item, index) => <option key={item} value={index}>{item}</option>)}
                    </SelectField>
                  </div>
                </div>
              )}
              {tariffAmount === null && (
                <p className="text-sm text-muted-foreground">Aucune prime pour ces critères. Choisissez une autre durée ou saisissez la prime du devis.</p>
              )}
            </div>
          ) : !awaitingTariff && hasAsset && hasPartner && (
            <div className={`${reveal} space-y-2 rounded-xl border bg-muted/45 p-3 sm:p-4`}>
              <Label htmlFor="simulation-premium"><Wallet aria-hidden className="size-4 text-muted-foreground" /> Prime d’assurance (FCFA)</Label>
              <Input id="simulation-premium" className="h-12 rounded-xl bg-background tabular-nums" type="text" inputMode="numeric" value={premium}
                onChange={event => setPremium(event.target.value)} placeholder="Montant du devis ou du barème"
                aria-invalid={premium.trim() ? !validAmount : undefined}
                aria-describedby={premium.trim() && !validAmount ? 'invalid-premium' : undefined} />
              {premium.trim() && !validAmount && <p id="invalid-premium" className="text-sm text-destructive">Saisissez un montant entier supérieur à zéro.</p>}
            </div>
          )}
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 sm:px-4">
            <Label htmlFor="simulation-sponsor" className="min-h-10 flex-1 cursor-pointer leading-snug">
              <Users aria-hidden className="size-4 shrink-0 text-muted-foreground" /> Prévoir un reversement au parrain
            </Label>
            <Switch id="simulation-sponsor" checked={hasSponsor} onCheckedChange={setHasSponsor}
              className="relative before:absolute before:-inset-2 before:content-[''] motion-reduce:transition-none motion-reduce:[&>span]:transition-none" />
          </div>
          {ready && (
            <Button asChild variant="outline" className={`${reveal} min-h-11 w-full lg:hidden`}>
              <a href="#simulation-result"><ArrowDown aria-hidden className="size-4" /> Voir l’estimation</a>
            </Button>
          )}
        </section>

        <section aria-labelledby="simulation-result" className={`${panel} scroll-mt-24 overflow-hidden`}>
          <div className="flex items-center gap-3 border-b px-4 py-4 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/25 text-kara-secondary-dark dark:text-kara-primary-light">
              <Calculator aria-hidden className="size-5" />
            </span>
            <h2 id="simulation-result" tabIndex={-1} className="scroll-mt-24 text-lg font-semibold tracking-tight">Estimation</h2>
          </div>
          <div aria-live="polite" className="space-y-4 p-4 sm:p-6">
            {ready && (
              <div className={`${reveal} flex flex-wrap items-start justify-between gap-2 rounded-xl border bg-muted/45 p-4`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Wallet aria-hidden className="size-4 shrink-0 text-muted-foreground" /> {premiumLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]">
                    {money.format(amount)} <span className="text-xs font-medium tracking-normal text-muted-foreground">FCFA</span>
                  </p>
                </div>
                {automatic && gridId && (
                  <Link className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-medium text-primary underline underline-offset-4 dark:text-kara-primary-light"
                    href="/vehicules/baremes#grille-tarifaire">
                    <FileText aria-hidden className="size-4 shrink-0" /> Consulter la grille tarifaire
                  </Link>
                )}
              </div>
            )}
            {result && rates && karaAmount !== null ? (
              <div className={`${reveal} space-y-4`}>
                <div className="relative isolate overflow-hidden rounded-xl bg-linear-to-br from-kara-secondary-dark to-kara-primary-dark p-4 text-white sm:p-5">
                  <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 -z-10 size-56 rounded-full border border-white/10 ring-[20px] ring-white/5" />
                  <Coins aria-hidden className="mb-3 size-5 text-kara-primary-light" />
                  <p className="text-sm font-medium">Part estimée de LE KARA</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-4xl">
                    {money.format(karaAmount)} <span className="text-sm font-medium tracking-normal text-white/75">FCFA</span>
                  </p>
                  <p className="mt-1 text-xs text-white/75">{hasSponsor ? 'Après reversement au parrain' : 'Sans reversement au parrain'}</p>
                  {result.expectedCommission > 0 && (
                    <div aria-hidden className="mt-4 flex h-2 overflow-hidden rounded-full bg-white/25">
                      <div className="h-full bg-kara-primary-light motion-safe:transition-[width] motion-safe:duration-300"
                        style={{ width: `${100 - sponsorPercent}%` }} />
                    </div>
                  )}
                </div>
                <dl className="grid divide-y overflow-hidden rounded-xl border">
                  {[
                    { icon: HandCoins, label: 'Commission attendue de l’assureur', amount: result.expectedCommission, detail: `${percent.format(rates.commissionRate)} % de la prime` },
                    { icon: Users, label: 'Part du parrain', amount: result.memberAmount, detail: hasSponsor ? `${percent.format(rates.memberSharePercent)} % de la commission` : 'Reversement désactivé' },
                  ].map(({ icon: Icon, label, amount, detail }) => (
                    <div key={label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3 sm:p-4">
                      <dt className="flex min-w-0 items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <Icon aria-hidden className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
                        </div>
                      </dt>
                      <dd className="ml-auto text-right text-base font-semibold tabular-nums [overflow-wrap:anywhere]">
                        {money.format(amount)} <span className="text-xs font-medium text-muted-foreground">FCFA</span>
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Info aria-hidden className="size-4 shrink-0" /> Le reversement dépend de la commission effectivement reçue.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Info aria-hidden className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{ready ? 'Taux indisponibles' : 'En attente des données'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ready
                      ? 'Renseignez les taux de cet assureur dans « Taux des assureurs » pour calculer la commission.'
                      : nextField}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
