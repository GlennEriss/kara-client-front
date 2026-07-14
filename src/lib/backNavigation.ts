import type { useRouter } from 'next/navigation'

type AppRouter = ReturnType<typeof useRouter>

/**
 * Retour navigateur avec repli : revient à la page précédente (qui conserve
 * l'état de liste synchronisé dans l'URL — onglet, page, recherche), ou pousse
 * la route de repli si l'utilisateur est arrivé directement (lien partagé,
 * notification, nouvel onglet).
 */
export function backOr(router: AppRouter, fallback: string): void {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
  } else {
    router.push(fallback)
  }
}
