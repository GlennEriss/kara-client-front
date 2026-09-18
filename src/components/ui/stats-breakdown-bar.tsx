'use client'

/**
 * Barre de répartition : une seule barre horizontale segmentée qui montre le
 * poids relatif de chaque état.
 *
 * Choisie plutôt qu'un camembert : les parts proches se comparent bien mieux sur
 * un axe unique, et la barre reste lisible en largeur réduite. Sans dépendance
 * de graphique — un empilement de `div` suffit et n'alourdit pas le bundle.
 *
 * L'identité ne repose jamais sur la couleur seule : chaque segment est repris
 * dans la légende avec son libellé, sa valeur et son pourcentage.
 */

import { cn } from '@/lib/utils'

export interface BreakdownSegment {
  label: string
  value: number
  /** Couleur du segment — reprend celle de la carte de stat correspondante. */
  color: string
}

interface StatsBreakdownBarProps {
  segments: BreakdownSegment[]
  /** Intitulé court affiché au-dessus de la barre. */
  title?: string
  className?: string
}

/** Part en pourcentage, arrondie pour l'affichage. */
function percentOf(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function StatsBreakdownBar({ segments, title, className }: StatsBreakdownBarProps) {
  const visible = segments.filter((s) => s.value > 0)
  const total = visible.reduce((sum, s) => sum + s.value, 0)

  // Rien à répartir : on n'affiche pas une barre vide, qui se lirait comme une
  // donnée à zéro plutôt que comme une absence de donnée.
  if (total === 0) return null

  const summary = visible
    .map((s) => `${s.label} : ${s.value} (${percentOf(s.value, total)} %)`)
    .join(', ')

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      )}

      {/* 2px de fond entre les segments : la séparation ne dépend pas du contraste
          entre deux couleurs voisines. `min-w-0` autorise la barre à se réduire
          dans une grille étroite au lieu de pousser la mise en page. */}
      <div
        className="flex h-2.5 w-full min-w-0 gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={`Répartition — ${summary}`}
      >
        {visible.map((segment) => (
          <div
            key={segment.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              // `flexGrow` plutôt qu'une largeur en % : les 2px d'écart sont
              // absorbés par le flex au lieu de provoquer un débordement.
              flexGrow: segment.value,
              flexBasis: 0,
              // 4px suffisent à rendre une part infime visible sans écraser les
              // autres : à 320px, cinq segments consomment au pire 28px.
              minWidth: 4,
              backgroundColor: segment.color,
            }}
            title={`${segment.label} : ${segment.value} (${percentOf(segment.value, total)} %)`}
          />
        ))}
      </div>

      {/* Légende : le texte reste en encre neutre, la pastille porte l'identité.
          Elle passe à la ligne plutôt que de déborder, et chaque entrée reste
          insécable pour ne jamais couper « 12 » de « 40 % ». */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-4">
        {visible.map((segment) => (
          <li
            key={segment.label}
            className="flex min-w-0 max-w-full items-center gap-1.5 text-[11px] text-gray-600 sm:text-xs"
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            {/* Seul le libellé se tronque ; la valeur et le pourcentage restent
                solidaires pour qu'on ne lise jamais « 12 » sans son « 40 % ». */}
            <span className="truncate">{segment.label}</span>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-gray-900">
              {segment.value}
            </span>
            <span className="shrink-0 whitespace-nowrap tabular-nums text-gray-400">
              {percentOf(segment.value, total)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
