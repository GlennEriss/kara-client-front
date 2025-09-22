"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, Phone, User, Heart } from "lucide-react"
import type { EmergencyContact } from "@/schemas/emergency-contact.schema"

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
const brand = {
  bg: "bg-[#234D65]",
  bgSoft: "bg-[#234D65]/10",
  text: "text-[#234D65]",
  ring: "ring-[#234D65]/30",
  hover: "hover:bg-[#1a3a4f]",
}

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————

type Props = {
  emergencyContact?: EmergencyContact
}

export default function EmergencyContact({ emergencyContact }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  if (!emergencyContact) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className={classNames(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
            "transition-colors",
            brand.bgSoft,
            "hover:bg-slate-100",
            "text-slate-700"
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          Contact d'urgence
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Contact d'urgence
          </DialogTitle>
          <DialogDescription>
            Informations de la personne à contacter en cas d'urgence
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Nom complet */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Nom complet</span>
            </div>
            <div className="text-sm text-slate-900">
              {emergencyContact.lastName}
              {emergencyContact.firstName && ` ${emergencyContact.firstName}`}
            </div>
          </div>

          {/* Relation */}
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Relation</span>
            </div>
            <div className="text-sm text-slate-900">
              {emergencyContact.relationship}
            </div>
          </div>

          {/* Téléphones */}
          <div className="space-y-2">
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Téléphone principal</span>
              </div>
              <div className="text-sm text-slate-900">
                {emergencyContact.phone1}
              </div>
            </div>
            
            {emergencyContact.phone2 && (
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Téléphone secondaire</span>
                </div>
                <div className="text-sm text-slate-900">
                  {emergencyContact.phone2}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
