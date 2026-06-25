"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useOverduePayments, type OverdueProduct, type OverduePayment } from '@/hooks/useOverduePayments'
import { generateWhatsAppUrl, resolveWhatsappNumber } from '@/domains/memberships/utils/whatsappUrl'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Building2, Calendar, Download, MessageCircle, Phone, RefreshCw, User } from 'lucide-react'
import { toast } from 'sonner'

interface OverdueCaissePaymentsListProps {
  /** Produit (caisse) dont on affiche les retards */
  product: OverdueProduct
}

function slugify(product: OverdueProduct): string {
  return product.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
}

// Montant formaté FR avec des espaces normales (les espaces fines insécables de
// toLocaleString s'affichent mal — "/" — dans la police par défaut de jsPDF)
function fmtAmount(n: number): string {
  return n.toLocaleString('fr-FR').replace(/\s/g, ' ')
}

/** Message de rappel de paiement amical envoyé via WhatsApp au retardataire. */
function buildReminderMessage(item: OverduePayment): string {
  const name = item.name?.trim() || 'cher membre'
  const due = format(item.dueAt, 'dd/MM/yyyy', { locale: fr })
  return `Bonjour ${name},

Petit rappel amical de la part de la famille KARA 🙏

Un versement ${item.typeLabel} de ${fmtAmount(item.amount)} FCFA pour ta ${item.product} est en retard depuis le ${due} (${item.daysOverdue} jour${item.daysOverdue > 1 ? 's' : ''}).

Merci de bien vouloir régulariser dès que possible. Pour toute question, nous restons à ta disposition.

— L'équipe KARA`
}

export function OverdueCaissePaymentsList({ product }: OverdueCaissePaymentsListProps) {
  const { data: items = [], isLoading, isError, refetch, isFetching } = useOverduePayments([product])

  const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0)

  const handleExportExcel = async () => {
    if (items.length === 0) {
      toast.info('Aucun versement en retard à exporter')
      return
    }
    try {
      const XLSX = await import('xlsx')

      const title = `Versements en retard — ${product}`
      const meta = `Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}  •  ${items.length} versement(s)  •  Total dû : ${fmtAmount(totalAmount)} FCFA`
      const header = ['Matricule', 'Membre / Groupe', 'Téléphone', 'Type', 'Montant dû (FCFA)', 'Échéance', 'Retard (jours)']
      const dataRows = items.map((i) => [
        i.matricule || '—',
        i.name,
        i.phone || '',
        i.typeLabel,
        i.amount, // nombre : Excel le formate et permet les totaux
        format(i.dueAt, 'dd/MM/yyyy', { locale: fr }),
        i.daysOverdue,
      ])

      const aoa: (string | number)[][] = [[title], [meta], [], header, ...dataRows]
      const worksheet = XLSX.utils.aoa_to_sheet(aoa)

      // Largeurs de colonnes + fusion du titre/méta sur toute la largeur
      worksheet['!cols'] = [
        { wch: 14 }, { wch: 26 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
      ]
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
      ]

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Retards')
      XLSX.writeFile(workbook, `versements_en_retard_${slugify(product)}.xlsx`)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  const handleExportPdf = async () => {
    if (items.length === 0) {
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
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })} • ${items.length} versement(s)`, 14, 20)

      autoTable(doc, {
        head: [['Matricule', 'Membre / Groupe', 'Téléphone', 'Type', 'Montant dû (FCFA)', 'Échéance', 'Retard (j)']],
        body: items.map((i) => [
          i.matricule || '—',
          i.name,
          i.phone || '—',
          i.typeLabel,
          fmtAmount(i.amount),
          format(i.dueAt, 'dd/MM/yyyy', { locale: fr }),
          i.daysOverdue.toString(),
        ]),
        startY: 26,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      doc.save(`versements_en_retard_${slugify(product)}.pdf`)
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }

  const handleSendWhatsApp = (item: OverduePayment) => {
    const whatsapp = resolveWhatsappNumber(item.whatsappNumber, [item.phone])
    if (!whatsapp) {
      toast.error('Aucun numéro de téléphone enregistré.')
      return
    }
    try {
      const url = generateWhatsAppUrl(whatsapp, buildReminderMessage(item))
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
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Total dû */}
      {!isLoading && items.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm">
          <span className="text-gray-600">Total dû en retard : </span>
          <span className="font-bold text-red-700 tabular-nums">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
        </div>
      )}

      {/* Tableau */}
      <Card className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Matricule</TableHead>
                  <TableHead>Membre / Groupe</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant dû</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right">Retard</TableHead>
                  <TableHead className="text-right">Rappel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}

                {!isLoading && isError && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-red-600">
                      Erreur lors du chargement des versements en retard.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                      🎉 Aucun versement en retard.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  !isError &&
                  items.map((i) => (
                    <TableRow key={i.key} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-xs text-gray-500">{i.matricule || '—'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 font-medium text-gray-900">
                          {i.isGroup ? (
                            <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          )}
                          {i.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        {i.phone ? (
                          <span className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            {i.phone}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{i.typeLabel}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-900 tabular-nums">
                        {i.amount.toLocaleString('fr-FR')} FCFA
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          {format(i.dueAt, 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 tabular-nums">
                          {i.daysOverdue} j
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSendWhatsApp(i)}
                          disabled={!resolveWhatsappNumber(i.whatsappNumber, [i.phone])}
                          title={resolveWhatsappNumber(i.whatsappNumber, [i.phone]) ? 'Envoyer un rappel sur WhatsApp' : 'Aucun numéro de téléphone'}
                          className="h-8 bg-[#25D366] hover:bg-[#1ebe5b] text-white disabled:opacity-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Rappel</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
