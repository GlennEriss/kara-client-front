"use client"

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import type { UserFilters } from '@/types/types'
import type { MemberWithSubscription } from '@/db/member.db'
import { getMembers } from '@/db/member.db'
import { getMembershipRequestById } from '@/db/membership.db'
import { Loader2 } from 'lucide-react'
import { getNationalityName } from '@/constantes/nationality'

interface ExportMembershipModalProps {
  isOpen: boolean
  onClose: () => void
  filters: UserFilters
}

type SortOrder = 'A-Z' | 'Z-A'
type QuantityMode = 'custom' | 'all'

export default function ExportMembershipModal({ isOpen, onClose, filters }: ExportMembershipModalProps) {
  const today = new Date()
  const defaultStart = new Date(today.getFullYear(), 0, 1)

  const [sortOrder, setSortOrder] = React.useState<SortOrder>('A-Z')
  const [quantityMode, setQuantityMode] = React.useState<QuantityMode>('custom')
  const [quantity, setQuantity] = React.useState<number>(50)
  const [dateStart, setDateStart] = React.useState<string>(formatDateInput(defaultStart))
  const [dateEnd, setDateEnd] = React.useState<string>(formatDateInput(today))
  const [isExporting, setIsExporting] = React.useState(false)

  function formatDateInput(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const da = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${da}`
  }

  function isWithinRange(d: Date, start: Date, end: Date) {
    const time = d.getTime()
    return time >= start.setHours(0, 0, 0, 0) && time <= end.setHours(23, 59, 59, 999)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const start = new Date(dateStart)
      const end = new Date(dateEnd)

      // Récupérer les membres par pages jusqu'à atteindre la quantité voulue (ou tous)
      let page = 1
      const pageSize = 100
      const collected: MemberWithSubscription[] = []
      const targetCount = quantityMode === 'all' ? Infinity : Math.max(0, Number(quantity) || 0)

      // Copie des filtres pour éviter mutation
      const baseFilters: UserFilters = { ...filters }

      // Boucle de pagination
      // Arrête lorsque: pas de page suivante, ou quantité atteinte
      // On filtre par date côté client (createdAt)
      // et on tri selon ordre demandé
      // Note: getMembers se charge de createdAt en Date
      //
      // ATTENTION: éviter les trop grosses exportations côté client
      for (;;) {
        const res = await getMembers(baseFilters, page, pageSize)
        const batch = (res?.data || []) as MemberWithSubscription[]
        if (batch.length === 0) break

        // Filtrer par plage de dates
        const filtered = batch.filter((m) => {
          const created = (m as any).createdAt instanceof Date ? (m as any).createdAt as Date : new Date((m as any).createdAt)
          return isWithinRange(created, new Date(start), new Date(end))
        })

        collected.push(...filtered)

        if (collected.length >= targetCount) break
        if (!res?.pagination?.hasNextPage) break
        page += 1
      }

      // Appliquer la limite si mode custom
      let toExport = collected
      if (quantityMode === 'custom' && Number.isFinite(targetCount)) {
        toExport = collected.slice(0, targetCount)
      }

      // Trier par ordre alphabétique (lastName, puis firstName)
      toExport.sort((a, b) => {
        const an = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase()
        const bn = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase()
        if (an < bn) return sortOrder === 'A-Z' ? -1 : 1
        if (an > bn) return sortOrder === 'A-Z' ? 1 : -1
        return 0
      })

      if (toExport.length === 0) {
        toast.info('Aucun membre à exporter selon les critères')
        return
      }

      // Récupérer les dossiers complets
      const rows: any[] = []
      for (const member of toExport) {
        try {
          const dossierId = (member as any).dossier
          const dossier = dossierId ? await getMembershipRequestById(dossierId) : null
          const r = buildRow(member as any, dossier as any)
          rows.push(r)
        } catch {
          const r = buildRow(member as any, null)
          rows.push(r)
        }
      }

      // Export CSV (compatible Excel)
      const csv = toCSV(rows)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `export_membres_${new Date().toISOString().slice(0,10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Export CSV généré')
      onClose()
    } catch (e) {
      toast.error("Erreur lors de l'export")
    } finally {
      setIsExporting(false)
    }
  }

  function buildRow(member: any, dossier: any) {
    const identity = dossier?.identity || {}
    const address = dossier?.address || {}
    const company = dossier?.company || {}
    const documents = dossier?.documents || {}

    const contacts = Array.isArray(identity.contacts)
      ? identity.contacts.join(' | ')
      : Array.isArray(member?.contacts)
      ? member.contacts.join(' | ')
      : ''

    // Paiements (si présents)
    const payments = Array.isArray(dossier?.payments) ? dossier.payments : []
    const paymentsCount = payments.length
    const paymentsTotal = payments.reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0)

    const toISO = (v: any) => {
      try {
        if (!v) return ''
        const d = v?.toDate ? v.toDate() : v instanceof Date ? v : new Date(v)
        return isNaN(d.getTime()) ? '' : d.toISOString()
      } catch {
        return ''
      }
    }

    return {
      // Métadonnées (fr)
      Matricule: member?.matricule || member?.id || '',
      'Accepté par': dossier?.processedBy || dossier?.reviewedBy || '',
      'Adhéré le': toISO(member?.createdAt),
      'Modifié le': toISO(member?.updatedAt),
      'Demande soumise le': toISO(dossier?.createdAt),
      'Demande modifiée le': toISO(dossier?.updatedAt),

      // Identity (fr)
      'Civilité': identity.civility ?? '',
      'Prénom': identity.lastName ?? member?.lastName ?? '',
      'Nom': identity.firstName ?? member?.firstName ?? '',
      'Date de naissance': identity.birthDate ?? '',
      'Lieu de naissance': identity.birthPlace ?? '',
      "Numéro d'acte de naissance": identity.birthCertificateNumber ?? '',
      'Lieu de prière': identity.prayerPlace ?? '',
      'Téléphones': contacts,
      'Email': identity.email ?? member?.email ?? '',
      'Sexe': identity.gender ?? member?.gender ?? '',
      'Nationalité': getNationalityName(identity.nationality ?? member?.nationality),
      'État civil': identity.maritalStatus ?? '',
      "Nom de l'épouse/époux": identity.spouseLastName ?? '',
      "Prénom de l'époux/épouse": identity.spouseFirstName ?? '',
      "Téléphone de l'époux/épouse": identity.spousePhone ?? '',
      'Code entremetteur': identity.intermediaryCode ?? '',
      'Possède un véhicule': String(identity.hasCar ?? member?.hasCar ?? ''),

      // Adresse (fr)
      'Province': address.province ?? member?.address?.province ?? '',
      'Ville': address.city ?? member?.address?.city ?? '',
      'Quartier': address.district ?? member?.address?.district ?? '',
      'Arrondissement': address.arrondissement ?? member?.address?.arrondissement ?? '',
      'Info additionnelle sur le lieu de résidence': address.additionalInfo ?? member?.address?.additionalInfo ?? '',

      // Entreprise (fr)
      'Entreprise': company.companyName ?? member?.companyName ?? '',
      'Province entreprise': company.companyAddress?.province ?? '',
      'Ville entreprise': company.companyAddress?.city ?? '',
      'Quartier entreprise': company.companyAddress?.district ?? '',
      'Profession': company.profession ?? member?.profession ?? '',
      'Expérience': company.seniority ?? '',

      // Pièce d'identité (fr)
      "Type de pièce d'identité": documents.identityDocument ?? '',
      "Numéro de la pièce d'identité": documents.identityDocumentNumber ?? '',
      "Date d'expiration de la pièce d'identité": documents.expirationDate ?? '',
      'Lieu de livraison de la pièce': documents.issuingPlace ?? '',
      "Date de délivraison de la pièce": documents.issuingDate ?? '',

      // Paiements
      'Nombre de paiements': paymentsCount,
      'Total des paiements': paymentsTotal,
    }
  }

  function toCSV(rows: any[]): string {
    if (!rows.length) return ''
    const headers = Object.keys(rows[0])
    
    // Ajouter le BOM UTF-8 pour Excel
    const BOM = '\uFEFF'
    
    const escape = (val: any) => {
      if (val == null) return ''
      const s = String(val).replace(/"/g, '""')
      return s.includes(';') || s.includes('\n') || s.includes('"') ? `"${s}"` : s
    }
    
    const lines = [headers.join(';')]
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(';'))
    }
    
    return BOM + lines.join('\r\n')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
      <DialogContent className="sm:max-w-lg shadow-2xl border-0">
        <DialogHeader>
          <DialogTitle>Exporter les membres</DialogTitle>
          <DialogDescription>Personnalisez votre export avant de générer le fichier</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ordre alphabétique */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ordre alphabétique</label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)} disabled={isExporting}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un ordre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A-Z">A - Z</SelectItem>
                <SelectItem value="Z-A">Z - A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantité */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nombre de membres</label>
            <div className="flex gap-2">
              <Select value={quantityMode} onValueChange={(v) => setQuantityMode(v as QuantityMode)} disabled={isExporting}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Nombre</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={isExporting || quantityMode === 'all'}
                className="w-32"
                min={1}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de début</label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} disabled={isExporting} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date de fin</label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} disabled={isExporting} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>Annuler</Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-[#234D65] hover:bg-[#234D65] text-white">
            {isExporting ? (
              <span className="inline-flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Export...</span>
            ) : (
              'Exporter'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

