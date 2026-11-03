'use client'

import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import routes from '@/constantes/routes'
import { BookOpen, CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useVisibleHelpTopics } from '../hooks/useVisibleHelpTopics'
import { findHelpContext } from '../utils/help-search'
import { HelpArticle } from './HelpArticle'

export default function HelpContextPanel({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()
  const { topics } = useVisibleHelpTopics()
  const context = findHelpContext(topics, pathname)
  const helpCenterUrl = context ? `${routes.admin.helpCenter}?fiche=${context.topic.key}` : routes.admin.helpCenter

  return (
    <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl">
      <SheetHeader className="border-b border-gray-100 pr-12">
        <SheetTitle className="flex items-center gap-2 text-[#234D65]">
          <CircleHelp className="h-5 w-5" />
          Aide
        </SheetTitle>
        <SheetDescription>{context ? 'La fiche de la page où vous êtes.' : 'Cette page n’a pas encore de fiche d’aide.'}</SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 p-4 sm:p-5">
        {context ? (
          <HelpArticle topic={context.topic} currentPage={context.page} compact />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Les fiches disponibles :</p>
            <ul className="space-y-2">
              {topics.map((topic) => (
                <li key={topic.key}>
                  <Link
                    href={`${routes.admin.helpCenter}?fiche=${topic.key}`}
                    onClick={onNavigate}
                    className="block rounded-xl border border-gray-200 bg-white p-3 hover:border-[#234D65]/40"
                  >
                    <span className="block text-sm font-semibold text-gray-900">{topic.title}</span>
                    <span className="block text-xs text-gray-500">{topic.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        <Link
          href={helpCenterUrl}
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#234D65] hover:bg-[#234D65]/5"
        >
          <BookOpen className="h-4 w-4" />
          Ouvrir le centre d’aide
        </Link>
      </div>
    </SheetContent>
  )
}
