'use client'
import React, { useState } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { invalidateAppStats } from '@/lib/invalidateAppStats'

export default function ReactQueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [queryClient] = useState(() => {
        // Référence au client utilisée par le MutationCache (closure : assignée avant
        // toute exécution de mutation, donc disponible au moment du onSuccess).
        const client: QueryClient = new QueryClient({
            queryCache: new QueryCache({
                onError: (error, query) => {
                    console.error(
                        `[ReactQuery] Erreur sur la requête "${String(query.queryKey)}":`,
                        error,
                    )
                },
            }),
            // LOGIQUE CENTRALE DE COHÉRENCE DES STATS :
            // Toute mutation réussie (créer/modifier/supprimer un membre, une demande,
            // un contrat, un paiement…) rafraîchit les stats/listes transverses de
            // TOUTES les sections (tableau de bord inclus). Garantit des chiffres
            // fiables et cohérents partout, sans avoir à l'appeler dans chaque hook.
            // Opt-out possible : `useMutation({ meta: { skipStatsInvalidation: true } })`.
            mutationCache: new MutationCache({
                onSuccess: (_data, _variables, _context, mutation) => {
                    const meta = mutation.meta as { skipStatsInvalidation?: boolean } | undefined
                    if (meta?.skipStatsInvalidation) return
                    invalidateAppStats(client)
                },
            }),
            defaultOptions: {
                queries: {
                    // 5 min : évite de re-fetcher les agrégats lourds trop souvent
                    staleTime: 5 * 60 * 1000,
                    gcTime: 10 * 60 * 1000,
                    retry: false,
                    // Ne pas relancer toutes les requêtes au retour de focus sur l'onglet
                    refetchOnWindowFocus: false,
                },
            },
        })
        return client
    });
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
