"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * Primitive de modale au format "membre" (kara-members-front) :
 *  - DialogContent sans padding, en flex-col, hauteur bornée (max-h-[90vh])
 *  - header sticky bordé (icône optionnelle dans un carré de marque)
 *  - corps scrollable
 *  - footer sticky bordé
 *
 * Deux usages :
 *  1. Composition fine : <Dialog><ModalContent><ModalHeader/><ModalBody/><ModalFooter/></ModalContent></Dialog>
 *  2. Raccourci : <Modal open title icon footer>…</Modal>
 */

const MODAL_SIZES = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
  "2xl": "sm:max-w-4xl",
  "3xl": "sm:max-w-5xl",
  "4xl": "sm:max-w-6xl",
} as const

export type ModalSize = keyof typeof MODAL_SIZES

/** Couleur du carré d'icône de l'en-tête selon l'intention de la modale. */
const MODAL_TONES = {
  default: "bg-[#234D65]",
  destructive: "bg-red-600",
  success: "bg-emerald-600",
  warning: "bg-amber-500",
} as const

export type ModalTone = keyof typeof MODAL_TONES

type ModalContentProps = React.ComponentProps<typeof DialogContent> & {
  size?: ModalSize
}

const ModalContent = React.forwardRef<
  React.ComponentRef<typeof DialogContent>,
  ModalContentProps
>(function ModalContent({ className, size = "lg", children, ...props }, ref) {
  return (
    <DialogContent
      ref={ref}
      className={cn(
        "flex max-h-[90vh] flex-col gap-0 p-0",
        MODAL_SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  )
})

ModalContent.displayName = "ModalContent"

type ModalHeaderProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: ModalTone
  className?: string
  /** Contenu d'en-tête personnalisé (étapes, badges…). Remplace title/description. */
  children?: React.ReactNode
}

function ModalHeader({
  title,
  description,
  icon: Icon,
  tone = "default",
  className,
  children,
}: ModalHeaderProps) {
  return (
    <div
      data-slot="modal-header"
      className={cn(
        "shrink-0 border-b border-gray-100 px-6 py-4",
        className
      )}
    >
      {children ?? (
        <div className="flex min-w-0 items-center gap-3 pr-8">
          {Icon && (
            <div className={cn("shrink-0 rounded-lg p-2", MODAL_TONES[tone])}>
              <Icon className="h-4 w-4 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {title && <DialogTitle className="text-base">{title}</DialogTitle>}
            {description && (
              <DialogDescription className="mt-0.5">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ModalBody = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  function ModalBody({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="modal-body"
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5",
          className
        )}
        {...props}
      />
    )
  }
)

ModalBody.displayName = "ModalBody"

function ModalFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-footer"
      className={cn(
        "flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-6 py-4",
        className
      )}
      {...props}
    />
  )
}

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: ModalTone
  size?: ModalSize
  footer?: React.ReactNode
  children: React.ReactNode
  contentClassName?: string
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  tone,
  size,
  footer,
  children,
  contentClassName,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent size={size} className={contentClassName}>
        <ModalHeader title={title} description={description} icon={icon} tone={tone} />
        <ModalBody>{children}</ModalBody>
        {footer && <ModalFooter>{footer}</ModalFooter>}
      </ModalContent>
    </Dialog>
  )
}

export { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter }
