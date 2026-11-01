'use client'

import { Input } from '@/components/ui/input'
import { PageHero } from '@/components/ui/page-hero'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { LifeBuoy, Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useMemo, useRef, useState } from 'react'
import { HELP_CATEGORY_ORDER } from '../content'
import { useVisibleHelpTopics } from '../hooks/useVisibleHelpTopics'
import { searchHelp } from '../utils/help-search'
import { HelpArticle } from './HelpArticle'

const DEFAULT_TOPIC = 'utiliser-aide'

export default function HelpCenterPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { topics, isLoading } = useVisibleHelpTopics()
  const [query, setQuery] = useState('')
  const articleRef = useRef<HTMLDivElement>(null)

  const requested = searchParams.get('fiche')
  const topic = topics.find((entry) => entry.key === requested) ?? topics.find((entry) => entry.key === DEFAULT_TOPIC) ?? topics[0]
  const results = useMemo(() => searchHelp(topics, query), [topics, query])
  const isSearching = query.trim().length > 1

  const openTopic = (key: string) => {
    router.replace(`${pathname}?fiche=${key}`, { scroll: false })
    // Sur mobile, l'article est sous la liste : on l'amène à l'écran.
    requestAnimationFrame(() => articleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <PageHero
        icon={LifeBuoy}
        title="Centre d’aide"
        subtitle="Prise en main, procédures, règles de calcul, statuts et réponses aux erreurs fréquentes de chaque section"
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher : paiement, pénalité, lot d’appels, permission, remboursement…"
          className="h-11 rounded-xl pl-9 pr-9"
          aria-label="Rechercher dans l’aide"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav aria-label="Fiches d’aide" className="space-y-5 lg:sticky lg:top-4 lg:self-start">
            {isSearching ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {results.length > 0 ? `${results.length} fiche${results.length > 1 ? 's' : ''} trouvée${results.length > 1 ? 's' : ''}` : 'Aucun résultat'}
                </p>
                {results.map((result) => (
                  <button
                    key={result.topic.key}
                    type="button"
                    onClick={() => openTopic(result.topic.key)}
                    className={cn(
                      'block w-full rounded-xl border p-3 text-left transition-colors',
                      topic?.key === result.topic.key ? 'border-[#234D65] bg-[#234D65]/5' : 'border-gray-200 bg-white hover:border-[#234D65]/40'
                    )}
                  >
                    <span className="block text-sm font-semibold text-gray-900">{result.topic.title}</span>
                    {result.sections.length > 0 && (
                      <span className="block text-xs text-gray-500">Dans : {result.sections.join(', ')}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              HELP_CATEGORY_ORDER.map((category) => {
                const categoryTopics = topics.filter((entry) => entry.category === category)
                if (categoryTopics.length === 0) return null
                return (
                  <div key={category} className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{category}</p>
                    {categoryTopics.map((entry) => (
                      <button
                        key={entry.key}
                        type="button"
                        onClick={() => openTopic(entry.key)}
                        className={cn(
                          'block w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                          topic?.key === entry.key ? 'bg-[#234D65] font-semibold text-white' : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        {entry.title}
                      </button>
                    ))}
                  </div>
                )
              })
            )}
          </nav>

          <div ref={articleRef} className="min-w-0 scroll-mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
            {topic ? (
              <HelpArticle topic={topic} />
            ) : (
              <p className="text-sm text-gray-500">Aucune fiche n’est disponible pour vos accès.</p>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Sur chaque page, le bouton « Aide » en haut à droite ouvre directement la fiche de la page.
      </p>
    </div>
  )
}
