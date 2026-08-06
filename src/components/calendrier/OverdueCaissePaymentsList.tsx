"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useOverduePayments, type OverdueProduct, type OverduePayment } from '@/hooks/useOverduePayments'
import { generateWhatsAppUrl, resolveWhatsappNumber } from '@/domains/memberships/utils/whatsappUrl'
import { useRenderMessageTemplate } from '@/domains/messaging/hooks/useMessageTemplates'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Building2, Calendar, ChevronDown, ChevronRight, Download, MessageCircle, Phone, RefreshCw, User } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { toast } from 'sonner'

interface OverdueCaissePaymentsListProps {
  /** Produit (caisse) dont on affiche les retards */
  product: OverdueProduct
}

/** Retardataire regroupé : une personne (ou un groupe) et l'ensemble de ses versements en retard. */
interface OverdueGroup {
  personKey: string
  matricule?: string
  name: string
  isGroup: boolean
  phone?: string
  whatsappNumber?: string
  product: OverdueProduct
  /** Versements en retard, triés du plus ancien au plus récent. */
  payments: OverduePayment[]
  count: number
  totalAmount: number
  maxDaysOverdue: number
  earliestDueAt: Date
  /** Libellés de type distincts (souvent un seul). */
  typeLabels: string[]
}

function slugify(product: OverdueProduct): string {
  return product.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
}

// Montant formaté FR avec des espaces normales (les espaces fines insécables de
// toLocaleString s'affichent mal — "/" — dans la police par défaut de jsPDF)
function fmtAmount(n: number): string {
  return n.toLocaleString('fr-FR').replace(/\s/g, ' ')
}

/** Clé d'identité d'un retardataire : le matricule si disponible, sinon le nom (+ type). */
function personKeyOf(item: OverduePayment): string {
  const mat = item.matricule?.trim()
  if (mat) return `mat:${mat}`
  return `${item.isGroup ? 'g' : 'm'}:${item.name.trim().toLowerCase()}`
}

/** Regroupe les versements en retard par personne/groupe. */
function groupOverdue(items: OverduePayment[]): OverdueGroup[] {
  const map = new Map<string, OverdueGroup>()

  for (const item of items) {
    const key = personKeyOf(item)
    const existing = map.get(key)
    if (existing) {
      existing.payments.push(item)
      existing.count += 1
      existing.totalAmount += item.amount || 0
      existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, item.daysOverdue)
      if (item.dueAt < existing.earliestDueAt) existing.earliestDueAt = item.dueAt
      if (!existing.typeLabels.includes(item.typeLabel)) existing.typeLabels.push(item.typeLabel)
      // Compléter les infos de contact si elles manquaient sur le premier versement.
      if (!existing.phone && item.phone) existing.phone = item.phone
      if (!existing.whatsappNumber && item.whatsappNumber) existing.whatsappNumber = item.whatsappNumber
      if (!existing.matricule && item.matricule) existing.matricule = item.matricule
    } else {
      map.set(key, {
        personKey: key,
        matricule: item.matricule,
        name: item.name,
        isGroup: item.isGroup,
        phone: item.phone,
        whatsappNumber: item.whatsappNumber,
        product: item.product,
        payments: [item],
        count: 1,
        totalAmount: item.amount || 0,
        maxDaysOverdue: item.daysOverdue,
        earliestDueAt: item.dueAt,
        typeLabels: [item.typeLabel],
      })
    }
  }

  const groups = Array.from(map.values())
  // Tri des versements internes du plus ancien au plus récent.
  for (const g of groups) {
    g.payments.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
  }
  // Les plus urgents (retard le plus élevé) en premier.
  groups.sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue)
  return groups
}

/** « 3 jours » / « 1 jour » — accord du pluriel réutilisé par les modèles. */
function daysLabel(days: number): string {
  return `${days} jour${days > 1 ? 's' : ''}`
}

/**
 * Choisit le modèle de rappel adapté au retardataire et fournit ses variables.
 * Le texte lui-même est édité dans Système → Modèles de messages.
 */
function reminderTemplateFor(group: OverdueGroup): { key: string; variables: Record<string, string | number> } {
  const name = group.name?.trim() || 'cher membre'
  const fmtDue = (d: Date) => format(d, 'dd/MM/yyyy', { locale: fr })

  // Placement : c'est KARA qui doit la commission au bienfaiteur — le message
  // l'informe (au lieu de lui réclamer un paiement).
  if (group.product === 'Placement') {
    return {
      key: 'placementCommissionDue',
      variables: {
        nom: name,
        // `typeLabel` distingue une commission d'une restitution de capital :
        // l'écrire en dur donnerait « Commission de 1 000 000 FCFA ».
        detail: group.payments
          .map((p) => `• ${p.typeLabel} : ${fmtAmount(p.amount)} FCFA (échéance du ${fmtDue(p.dueAt)})`)
          .join('\n'),
      },
    }
  }

  if (group.count === 1) {
    const p = group.payments[0]
    return {
      key: 'paymentReminderSingle',
      variables: {
        nom: name,
        produit: group.product,
        typeVersement: p.typeLabel,
        montant: fmtAmount(p.amount),
        dateEcheance: fmtDue(p.dueAt),
        joursRetard: daysLabel(p.daysOverdue),
      },
    }
  }

  return {
    key: 'paymentReminderMultiple',
    variables: {
      nom: name,
      produit: group.product,
      nombre: group.count,
      montantTotal: fmtAmount(group.totalAmount),
      dateEcheance: fmtDue(group.earliestDueAt),
      joursRetard: daysLabel(group.maxDaysOverdue),
      detail: group.payments
        .map((p) => `• ${p.typeLabel} — ${fmtAmount(p.amount)} FCFA (échéance du ${fmtDue(p.dueAt)})`)
        .join('\n'),
    },
  }
}

export function OverdueCaissePaymentsList({ product }: OverdueCaissePaymentsListProps) {
  const { data: items = [], isLoading, isError, refetch, isFetching } = useOverduePayments([product])
  // Textes de relance personnalisables (Système → Modèles de messages).
  const renderMessage = useRenderMessageTemplate()

  const groups = useMemo(() => groupOverdue(items), [items])
  const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleExportExcel = async () => {
    if (groups.length === 0) {
      toast.info('Aucun versement en retard à exporter')
      return
    }
    try {
      const XLSX = await import('xlsx')

      const title = `Versements en retard — ${product}`
      const meta = `Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}  •  ${groups.length} retardataire(s)  •  ${items.length} versement(s)  •  Total dû : ${fmtAmount(totalAmount)} FCFA`
      const header = ['Matricule', 'Membre / Groupe', 'Téléphone', 'Nb retards', 'Montant total dû (FCFA)', 'Échéance la plus ancienne', 'Retard max (jours)']
      const dataRows = groups.map((g) => [
        g.matricule || '—',
        g.name,
        g.phone || '',
        g.count,
        g.totalAmount, // nombre : Excel le formate et permet les totaux
        format(g.earliestDueAt, 'dd/MM/yyyy', { locale: fr }),
        g.maxDaysOverdue,
      ])

      // Ligne total en bas de la synthèse.
      const totalRow: (string | number)[] = ['', 'TOTAL', '', items.length, totalAmount, '', '']
      const aoa: (string | number)[][] = [[title], [meta], [], header, ...dataRows, [], totalRow]
      const worksheet = XLSX.utils.aoa_to_sheet(aoa)

      // Largeurs de colonnes + fusion du titre/méta sur toute la largeur
      worksheet['!cols'] = [
        { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 11 }, { wch: 20 }, { wch: 20 }, { wch: 16 },
      ]
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      ]

      // Feuille "Détail" : un versement en retard par ligne (rapprochement comptable).
      const detailHeader = ['Matricule', 'Membre / Groupe', 'Téléphone', 'Type', 'Montant dû (FCFA)', 'Échéance', 'Retard (jours)']
      const detailRows = items.map((i) => [
        i.matricule || '—',
        i.name,
        i.phone || '',
        i.typeLabel,
        i.amount,
        format(i.dueAt, 'dd/MM/yyyy', { locale: fr }),
        i.daysOverdue,
      ])
      const detailSheet = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows])
      detailSheet['!cols'] = [
        { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Synthèse')
      XLSX.utils.book_append_sheet(workbook, detailSheet, 'Détail')
      XLSX.writeFile(workbook, `versements_en_retard_${slugify(product)}.xlsx`)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  const handleExportPdf = async () => {
    if (groups.length === 0) {
      toast.info('Aucun versement en retard à exporter')
      return
    }
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      doc.setFontSize(16)
      doc.text(`Versements en retard — ${product}`, 14, 14)
      doc.setFontSize(10)
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })} • ${groups.length} retardataire(s) • ${items.length} versement(s)`, 14, 20)

      autoTable(doc, {
        head: [['Matricule', 'Membre / Groupe', 'Téléphone', 'Nb retards', 'Montant total dû (FCFA)', 'Échéance la + ancienne', 'Retard max (j)']],
        body: groups.map((g) => [
          g.matricule || '—',
          g.name,
          g.phone || '—',
          g.count.toString(),
          fmtAmount(g.totalAmount),
          format(g.earliestDueAt, 'dd/MM/yyyy', { locale: fr }),
          g.maxDaysOverdue.toString(),
        ]),
        foot: [['', 'TOTAL', '', items.length.toString(), fmtAmount(totalAmount), '', '']],
        startY: 26,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      doc.save(`versements_en_retard_${slugify(product)}.pdf`)
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }

  const handleSendWhatsApp = (group: OverdueGroup) => {
    const whatsapp = resolveWhatsappNumber(group.whatsappNumber, [group.phone])
    if (!whatsapp) {
      toast.error('Aucun numéro de téléphone enregistré.')
      return
    }
    try {
      const { key, variables } = reminderTemplateFor(group)
      const url = generateWhatsAppUrl(whatsapp, renderMessage(key, variables))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Numéro de téléphone invalide.')
    }
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">Versements en retard</h3>
          {!isLoading && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {groups.length} retardataire{groups.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={groups.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={groups.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Total dû */}
      {!isLoading && groups.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm">
          <span className="text-gray-600">Total dû en retard : </span>
          <span className="font-bold text-red-700 tabular-nums">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
          <span className="text-gray-500"> • {items.length} versement{items.length !== 1 ? 's' : ''} sur {groups.length} retardataire{groups.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Tableau */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Matricule</TableHead>
                  <TableHead>Membre / Groupe</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-center">Retards</TableHead>
                  <TableHead className="text-right">Montant total dû</TableHead>
                  <TableHead>Échéance la + ancienne</TableHead>
                  <TableHead className="text-right">Retard max</TableHead>
                  <TableHead className="text-right">Rappel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!isLoading && isError && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-red-600">
                      Erreur lors du chargement des versements en retard.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && groups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                      🎉 Aucun versement en retard.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  !isError &&
                  groups.map((g) => {
                    const isMulti = g.count > 1
                    const isOpen = expanded.has(g.personKey)
                    const canRemind = !!resolveWhatsappNumber(g.whatsappNumber, [g.phone])
                    return (
                      <Fragment key={g.personKey}>
                        <TableRow
                          className={`hover:bg-gray-50 ${isMulti ? 'cursor-pointer' : ''}`}
                          onClick={isMulti ? () => toggleExpanded(g.personKey) : undefined}
                          role={isMulti ? 'button' : undefined}
                          tabIndex={isMulti ? 0 : undefined}
                          aria-expanded={isMulti ? isOpen : undefined}
                          onKeyDown={
                            isMulti
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    toggleExpanded(g.personKey)
                                  }
                                }
                              : undefined
                          }
                        >
                          <TableCell className="text-gray-400">
                            {isMulti ? (
                              isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">{g.matricule || '—'}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 font-medium text-gray-900">
                              {g.isGroup ? (
                                <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              ) : (
                                <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                              {g.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            {g.phone ? (
                              <span className="flex items-center gap-1.5 text-sm text-gray-700">
                                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                {g.phone}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                                isMulti ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                              }`}
                              title={isMulti ? 'Cliquez pour voir le détail des versements' : undefined}
                            >
                              {g.count} retard{g.count > 1 ? 's' : ''}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-gray-900 tabular-nums">
                            {g.totalAmount.toLocaleString('fr-FR')} FCFA
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              {format(g.earliestDueAt, 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 tabular-nums">
                              {g.maxDaysOverdue} j
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSendWhatsApp(g)
                              }}
                              disabled={!canRemind}
                              title={canRemind ? 'Envoyer un rappel sur WhatsApp' : 'Aucun numéro de téléphone'}
                              className="h-8 bg-[#25D366] hover:bg-[#1ebe5b] text-white disabled:opacity-50"
                            >
                              <MessageCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                              <span className="hidden sm:inline">Rappel</span>
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isMulti && isOpen && (
                          <TableRow className="bg-gray-50/60">
                            <TableCell />
                            <TableCell colSpan={8} className="py-2">
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                  Détail des {g.count} versements en retard
                                </p>
                                <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                                  {g.payments.map((p) => (
                                    <div key={p.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                      <span className="text-gray-600">{p.typeLabel}</span>
                                      <span className="flex items-center gap-1.5 text-gray-700">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                        {format(p.dueAt, 'dd/MM/yyyy', { locale: fr })}
                                      </span>
                                      <span className="font-semibold text-gray-900 tabular-nums">
                                        {p.amount.toLocaleString('fr-FR')} FCFA
                                      </span>
                                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 tabular-nums">
                                        {p.daysOverdue} j
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
