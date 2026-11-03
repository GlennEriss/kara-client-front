'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { CircleHelp, Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import React, { useState } from 'react'

const HelpContextPanel = dynamic(() => import('./HelpContextPanel'), {
  ssr: false,
  loading: () => (
    <SheetContent side="right" className="w-full sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>Aide</SheetTitle>
        <SheetDescription>Chargement de l’aide de cette page…</SheetDescription>
      </SheetHeader>
      <div role="status" className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement en cours…
      </div>
    </SheetContent>
  ),
})

/** Bouton « Aide » de la barre du haut : la fiche de la page en cours, dans un panneau. */
export function HelpButton() {
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setHasOpened(true)
    setOpen(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#234D65]"
          aria-label="Aide sur cette page"
        >
          <CircleHelp className="h-5 w-5" />
          <span className="hidden lg:inline">Aide</span>
        </button>
      </SheetTrigger>
      {hasOpened && <HelpContextPanel onNavigate={() => setOpen(false)} />}
    </Sheet>
  )
}
