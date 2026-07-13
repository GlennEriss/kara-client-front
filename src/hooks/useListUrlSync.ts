'use client'

/**
 * Synchronisation URL de l'état d'une liste (onglet, page, filtres, vue…).
 *
 * Même mécanisme que les listes de demandes (CI/CS/Crédit/Placement) :
 *  - à l'arrivée, le composant initialise son état depuis les query params ;
 *  - à chaque changement, l'URL est réécrite via router.replace sans
 *    rechargement ni défilement.
 * Résultat : le bouton retour (ou un lien partagé) retrouve la liste
 * exactement au même endroit.
 *
 * Convention : une valeur PAR DÉFAUT est passée à `null`/`undefined` pour
 * rester ABSENTE de l'URL (URLs propres, ex. pas de `?page=1`).
 *
 * Usage :
 *   const searchParams = useSearchParams()
 *   const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
 *   const [tab, setTab] = useState(searchParams.get('tab') || 'all')
 *   useListUrlSync({
 *     page: page > 1 ? page : null,
 *     tab: tab !== 'all' ? tab : null,
 *   })
 */

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useListUrlSync(params: Record<string, string | number | null | undefined>): void {
  const router = useRouter()
  // Sérialisation stable : l'effet ne rejoue que si une valeur change vraiment.
  const serialized = JSON.stringify(params)

  useEffect(() => {
    const entries = JSON.parse(serialized) as Record<string, string | number | null>
    // Fusion avec l'URL courante : on ne touche QUE nos clés, pour que
    // plusieurs listes/onglets synchronisés puissent cohabiter sur une page.
    const urlParams = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(entries)) {
      if (value === null || value === undefined || value === '') urlParams.delete(key)
      else urlParams.set(key, String(value))
    }
    const queryString = urlParams.toString()
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname

    if (window.location.search.replace(/^\?/, '') !== queryString) {
      router.replace(newUrl, { scroll: false })
    }
  }, [serialized, router])
}
