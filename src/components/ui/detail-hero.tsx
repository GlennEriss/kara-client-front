import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { AlertCircle, ArrowLeft, FileText } from 'lucide-react'
import * as React from 'react'

/**
 * En-tête des fiches de détail au gabarit Caisse Spéciale.
 *
 * `DetailHero` fixe le bandeau dégradé — bouton retour, badge de statut,
 * référence en monospace et tuiles de chiffres clés — et `DetailHeroSkeleton` /
 * `DetailNotFound` les états de chargement et d'erreur assortis.
 *
 * Les fiches **contrat** suivent un autre gabarit : barre d'actions, carte titre
 * dégradée et `StatStrip` (voir `@/components/ui/stat-strip`).
 */

export type DetailHeroStat = {
  label: string
  value: React.ReactNode
  /** Permet d'étaler une tuile sur toute la largeur en petit écran. */
  wide?: boolean
}

type DetailHeroProps = {
  /** Surtitre : le module d'où vient la fiche. Ex. « Demande de placement ». */
  eyebrow: string
  title: string
  /** Référence affichée dans une puce monospace (identifiant métier). */
  reference?: string
  onBack: () => void
  backLabel?: string
  /** Badge de statut, aligné à droite du bouton retour. */
  badge?: React.ReactNode
  /** Actions complémentaires, à côté du badge. */
  actions?: React.ReactNode
  /** Chiffres clés : 2 à 3 tuiles lisibles d'un coup d'œil. */
  stats?: DetailHeroStat[]
  className?: string
}

export function DetailHero({
  eyebrow,
  title,
  reference,
  onBack,
  backLabel = 'Retour',
  badge,
  actions,
  stats,
  className,
}: DetailHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl border border-[#234D65]/20 bg-gradient-to-br from-[#1f455b] via-[#234D65] to-[#2c5a73] p-5 text-white shadow-xl md:p-7',
        className
      )}
    >
      <div className="absolute inset-0 opacity-35 [background:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,0.2),transparent_40%)]" />
      <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(135deg,#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={onBack}
            className="h-10 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>

          {(badge || actions) && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {badge}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white/80">{eyebrow}</p>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
            {reference && (
              <div className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                <FileText className="h-4 w-4 shrink-0 text-white/80" />
                <span className="truncate font-mono text-xs text-white md:text-sm">#{reference}</span>
              </div>
            )}
          </div>

          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    'rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm',
                    stat.wide && 'col-span-2 sm:col-span-1'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wide text-white/70">{stat.label}</p>
                  <p className="mt-1 text-sm font-bold md:text-base">{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/** Squelette de chargement reprenant la silhouette du hero et des cartes. */
export function DetailHeroSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6 shadow-lg">
        <Skeleton className="h-5 w-36 bg-white/20" />
        <Skeleton className="mt-4 h-10 w-72 bg-white/20" />
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl bg-white/20" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/** État « introuvable / erreur » assorti au hero. */
export function DetailNotFound({
  title,
  message,
  onBack,
  backLabel = 'Retour',
}: {
  title: string
  message: string
  onBack: () => void
  backLabel?: string
}) {
  return (
    <Card className="border-red-200 bg-red-50/40 shadow-lg">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-red-900">{title}</h2>
          <p className="max-w-md text-sm text-red-700">{message}</p>
        </div>
        <Button
          variant="outline"
          onClick={onBack}
          className="border-red-300 text-red-700 hover:bg-red-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
      </CardContent>
    </Card>
  )
}
