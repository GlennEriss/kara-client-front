"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DOCUMENT_TYPE_OPTIONS,
    getDocumentTypeLabel,
} from "@/domains/infrastructure/documents/constants/document-types"
import { RelationshipEnum } from "@/schemas/emergency-contact.schema"
import type { EmergencyContact } from "@/schemas/emergency-contact.schema"
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { AlertTriangle, Heart, IdCard, Loader2, Pencil, Phone, User } from "lucide-react"
import { useState } from "react"

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
  /**
   * Active l'édition (réservée au superAdmin) du contact d'urgence du contrat.
   * 'CI' = Caisse Imprévue, 'CS' = Caisse Spéciale. Nécessite `contractId`.
   */
  contractKind?: 'CI' | 'CS'
  contractId?: string
}

const RELATIONSHIP_OPTIONS = RelationshipEnum.options

/** Persiste le contact d'urgence sur le contrat (CI ou CS) via le SDK client. */
async function persistEmergencyContact(
  contractKind: 'CI' | 'CS',
  contractId: string,
  emergencyContact: EmergencyContact,
): Promise<void> {
  if (contractKind === 'CI') {
    const { RepositoryFactory } = await import('@/factories/RepositoryFactory')
    await RepositoryFactory.getContractCIRepository().updateContract(contractId, {
      emergencyContact,
    } as never)
  } else {
    const { updateContract } = await import('@/db/caisse/contracts.db')
    await updateContract(contractId, { emergencyContact })
  }
}

export default function EmergencyContact({ emergencyContact, contractKind, contractId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const isSuperAdmin = useIsSuperAdmin()
  const queryClient = useQueryClient()
  const canEdit = isSuperAdmin && !!contractKind && !!contractId
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EmergencyContact | null>(null)

  const startEdit = () => {
    if (!emergencyContact) return
    setForm({ ...emergencyContact })
    setEditing(true)
  }

  const setField = <K extends keyof EmergencyContact>(key: K, value: EmergencyContact[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const handleSave = async () => {
    if (!form || !contractKind || !contractId) return
    if (!form.lastName?.trim() || !form.phone1?.trim() || !form.relationship) {
      toast.error('Nom, téléphone principal et lien sont obligatoires')
      return
    }
    setSaving(true)
    try {
      await persistEmergencyContact(contractKind, contractId, form)
      // Rafraîchit le détail + les listes pour refléter la modification
      const detailKey = contractKind === 'CI' ? ['contractCI', contractId] : ['caisse-contract', contractId]
      await queryClient.invalidateQueries({ queryKey: detailKey })
      await queryClient.invalidateQueries({
        queryKey: contractKind === 'CI' ? ['contractsCI'] : ['caisse-contracts'],
      })
      toast.success("Contact d'urgence mis à jour")
      setEditing(false)
    } catch {
      toast.error('Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

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
      
      <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Contact d'urgence
              </DialogTitle>
              <DialogDescription>
                Informations de la personne à contacter en cas d'urgence
              </DialogDescription>
            </div>
            {canEdit && !editing && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="flex-shrink-0"
                onClick={startEdit}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
              </Button>
            )}
          </div>
        </DialogHeader>

        {editing && form ? (
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Nom</Label>
                <Input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Prénom</Label>
                <Input value={form.firstName ?? ''} onChange={(e) => setField('firstName', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Lien</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#234D65]/40"
                  value={form.relationship}
                  onChange={(e) => setField('relationship', e.target.value as EmergencyContact['relationship'])}
                >
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Téléphone principal</Label>
                <Input value={form.phone1} onChange={(e) => setField('phone1', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Téléphone secondaire</Label>
                <Input value={form.phone2 ?? ''} onChange={(e) => setField('phone2', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Type de document</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#234D65]/40"
                  value={form.typeId ?? ''}
                  onChange={(e) => setField('typeId', e.target.value)}
                >
                  <option value="">—</option>
                  {DOCUMENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-slate-500">N° de document</Label>
                <Input value={form.idNumber ?? ''} onChange={(e) => setField('idNumber', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setEditing(false)}>
                Annuler
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
                {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
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

          {/* Pièce d'identité */}
          {(emergencyContact.typeId || emergencyContact.idNumber || emergencyContact.documentPhotoUrl) && (
            <div className="space-y-2">
              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="flex items-center gap-2 mb-3">
                  <IdCard className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Pièce d'identité</span>
                </div>
                
                {emergencyContact.typeId && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-600">Type de document:</span>
                    <div className="text-sm text-slate-900 mt-1">
                      {getDocumentTypeLabel(emergencyContact.typeId)}
                    </div>
                  </div>
                )}
                
                {emergencyContact.idNumber && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-slate-600">Numéro de document:</span>
                    <div className="text-sm text-slate-900 mt-1 font-mono">
                      {emergencyContact.idNumber}
                    </div>
                  </div>
                )}
                
                {emergencyContact.documentPhotoUrl && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-slate-600 block mb-2">Photo du document:</span>
                    <div className="relative w-full border-2 border-slate-200 rounded-lg overflow-hidden bg-white">
                      <img
                        src={emergencyContact.documentPhotoUrl}
                        alt="Document d'identité"
                        className="w-full h-auto max-h-64 object-contain"
                        onError={(e) => {
                          console.error('Erreur lors du chargement de l\'image:', emergencyContact.documentPhotoUrl)
                          const target = e.currentTarget as HTMLImageElement
                          target.style.display = 'none'
                        }}
                        onLoad={(e) => {
                          const target = e.currentTarget as HTMLImageElement
                          target.style.display = 'block'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
