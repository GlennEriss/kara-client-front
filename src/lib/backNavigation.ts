import type { useRouter } from 'next/navigation'

type AppRouter = ReturnType<typeof useRouter>

/**
 * Retour navigateur avec repli : revient à la page précédente (qui conserve
 * l'état de liste synchronisé dans l'URL — onglet, page, recherche), ou pousse
 * la route de repli si l'utilisateur est arrivé directement (lien partagé,
 * notification, nouvel onglet).
 */
export function backOr(router: AppRouter, fallback: string): void {
  if (typeof window === 'undefined') {
    router.push(fallback)
    return
  }

  // `history.length` compte aussi les pages d'autres sites visitées dans l'onglet :
  // il peut être > 1 sans qu'il existe d'entrée précédente DANS l'application.
  // Le routeur de Next.js numérote ses propres entrées dans `history.state.idx`,
  // qui est donc le signal fiable quand il est disponible.
  const idx = (window.history.state as { idx?: number } | null)?.idx
  const hasPrevious =
    typeof idx === 'number' ? idx > 0 : window.history.length > 1

  if (hasPrevious) {
    router.back()
  } else {
    router.push(fallback)
  }
}
