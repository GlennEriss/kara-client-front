'use client'
import React, { useState } from 'react'
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function ReactQueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                queryCache: new QueryCache({
                    onError: (error, query) => {
                        console.error(
                            `[ReactQuery] Erreur sur la requête "${String(query.queryKey)}":`,
                            error,
                        )
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
    );
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
