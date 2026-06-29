"use client"

/**
 * Variante responsive des modales, alignée sur le design de l'app membre
 * (kara-members-front) : modale centrée, en-tête teal KARA (#234D65) avec icône,
 * quasi pleine largeur + scroll vertical sur mobile, boutons pleine largeur sur
 * petit écran. API identique à `@/components/ui/dialog` : il suffit de changer le
 * chemin d'import dans une modale pour adopter ce style (JSX inchangé).
 */

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"
// Primitives non restylées réutilisées telles quelles.
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTrigger,
} from "@/components/ui/dialog"

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }
>(function DialogContent({ className, children, showCloseButton = true, ...props }, ref) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        className={cn(
          // Base (mobile-first) : centrée, quasi pleine largeur + scroll, coins arrondis.
          // `className` passé en dernier => les largeurs/padding propres à chaque modale priment.
          "bg-white fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-gray-200 p-5 shadow-xl duration-200 max-h-[90dvh] overflow-y-auto sm:p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-[#234D65]/40 focus:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = "ResponsiveDialogContent"

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto",
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        // Look KARA : teal, gras, icône alignée. La couleur propre à une modale
        // (ex. rouge destructif) reste prioritaire car `className` passe en dernier.
        "flex items-center gap-2 text-lg leading-tight font-bold text-[#234D65] sm:text-xl [&_svg]:h-5 [&_svg]:w-5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-gray-500", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
