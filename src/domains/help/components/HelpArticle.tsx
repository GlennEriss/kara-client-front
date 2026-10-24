'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, ChevronDown, Info, MapPin } from 'lucide-react'
import React from 'react'
import { HELP_SECTION_TITLES, type HelpBlock, type HelpPage, type HelpTopic } from '../entities/help.types'

function HelpBlockView({ block }: { block: HelpBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm leading-relaxed text-gray-700">{block.text}</p>
    case 'list':
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-700">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )
    case 'steps':
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-3.5">
          <p className="mb-2 text-sm font-semibold text-gray-900">{block.title}</p>
          <ol className="space-y-2">
            {block.items.map((item, index) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#234D65] text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )
    case 'definitions':
      return (
        <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {block.items.map((item) => (
            <div key={item.term} className="px-3.5 py-2.5">
              <dt className="text-sm font-semibold text-gray-900">{item.term}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-gray-600">{item.text}</dd>
            </div>
          ))}
        </dl>
      )
    case 'faq':
      return (
        <div className="space-y-2">
          {block.items.map((item) => (
            <details key={item.question} className="group rounded-xl border border-gray-200 bg-white px-3.5 py-2.5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.answer}</p>
            </details>
          ))}
        </div>
      )
    case 'note': {
      const Icon = block.tone === 'warning' ? AlertTriangle : Info
      return (
        <div
          className={cn(
            'flex gap-2.5 rounded-xl border p-3 text-sm leading-relaxed',
            block.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-[#234D65]/15 bg-[#234D65]/5 text-[#1f3f53]'
          )}
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{block.text}</p>
        </div>
      )
    }
  }
}

/** Une fiche d'aide ; `currentPage` met en avant la page d'où l'aide est ouverte. */
export function HelpArticle({ topic, currentPage, compact = false }: { topic: HelpTopic; currentPage?: HelpPage; compact?: boolean }) {
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#234D65]/70">{topic.category}</p>
        <h2 className={cn('font-bold text-gray-900', compact ? 'text-lg' : 'text-xl')}>{topic.title}</h2>
        <p className="text-sm leading-relaxed text-gray-600">{topic.summary}</p>
        {currentPage ? (
          <div className="flex gap-2.5 rounded-xl border border-[#234D65]/20 bg-[#234D65]/5 p-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#234D65]" />
            <p className="text-sm leading-relaxed text-gray-700">
              <span className="font-semibold text-[#234D65]">Vous êtes sur « {currentPage.label} ».</span> {currentPage.summary}
            </p>
          </div>
        ) : (
          topic.pages.length > 1 && (
            <ul className="flex flex-wrap gap-1.5">
              {topic.pages.map((page) => (
                <li key={page.path} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs text-gray-600" title={page.summary}>
                  {page.label}
                </li>
              ))}
            </ul>
          )
        )}
      </header>

      {topic.sections.map((section) => (
        <section key={section.kind} id={`aide-${topic.key}-${section.kind}`} className="space-y-3">
          <h3 className="border-b border-gray-200 pb-1.5 text-sm font-bold uppercase tracking-wider text-[#234D65]">
            {HELP_SECTION_TITLES[section.kind]}
          </h3>
          {section.blocks.map((block, index) => <HelpBlockView key={index} block={block} />)}
        </section>
      ))}
    </article>
  )
}
