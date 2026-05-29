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
                        staleTime: 60 * 1000,
                        retry: false,
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
