/**
 * Page Anniversaires — vue façon Facebook
 *
 * Affiche les anniversaires regroupés par proximité :
 * - Aujourd'hui
 * - Cette semaine (J+1 → J+7)
 * - À venir (J+8 → J+30)
 * - Passés récemment (7 derniers jours)
 *
 * Chaque membre a un bouton pour envoyer un message d'anniversaire WhatsApp.
 */

'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Cake, CalendarClock, CalendarDays, History } from 'lucide-react'
import { useMemberBirthdays } from '../../hooks/useMemberBirthdays'
import { BirthdayCard } from './BirthdayCard'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { BirthdayMember } from '../../types/birthdays'

// Seuil "passé récemment" : anniversaire dans les ~7 derniers jours
// (daysUntil compte vers le PROCHAIN anniversaire, donc un anniv passé récemment a un daysUntil élevé)
const RECENT_PAST_THRESHOLD = 358

interface BirthdaySectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  members: BirthdayMember[]
}

function BirthdaySection({ title, icon: Icon, accent, members }: BirthdaySectionProps) {
  if (members.length === 0) return null
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${accent}`} />
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
          {members.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => (
          <BirthdayCard key={member.id} member={member} />
        ))}
      </div>
    </section>
  )
}

export function BirthdaysPage() {
  // Tout récupérer (le repository ne pose pas de limite Firestore, il slice côté client)
  const { data: allBirthdays, isLoading } = useMemberBirthdays({ itemsPerPage: 100000 })

  const groups = useMemo(() => {
    const today: BirthdayMember[] = []
    const thisWeek: BirthdayMember[] = []
    const upcoming: BirthdayMember[] = []
    const recentPast: BirthdayMember[] = []

    for (const m of allBirthdays) {
      if (m.daysUntil === 0) today.push(m)
      else if (m.daysUntil >= 1 && m.daysUntil <= 7) thisWeek.push(m)
      else if (m.daysUntil >= 8 && m.daysUntil <= 30) upcoming.push(m)
      else if (m.daysUntil >= RECENT_PAST_THRESHOLD) recentPast.push(m)
    }

    // Passés : du plus récent (le plus proche d'aujourd'hui) au plus ancien
    recentPast.sort((a, b) => b.daysUntil - a.daysUntil)

    return { today, thisWeek, upcoming, recentPast }
  }, [allBirthdays])

  const hasAny =
    groups.today.length > 0 ||
    groups.thisWeek.length > 0 ||
    groups.upcoming.length > 0 ||
    groups.recentPast.length > 0

  const handleExportExcel = async () => {
    if (!allBirthdays || allBirthdays.length === 0) {
      toast.info('Aucun anniversaire à exporter')
      return
    }
    try {
      const XLSX = await import('xlsx')
      const rows = allBirthdays.map((b) => ({
        Nom: b.lastName || '',
        Prénom: b.firstName || '',
        Matricule: b.matricule || '',
        'Date de naissance': format(new Date(b.birthDate), 'dd/MM/yyyy', { locale: fr }),
        'Prochain anniversaire': format(b.nextBirthday, 'dd/MM/yyyy', { locale: fr }),
        'Jours restants': b.daysUntil,
        'Âge': b.age,
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Anniversaires')
      XLSX.writeFile(workbook, 'anniversaires.xlsx')
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  const handleExportPdf = async () => {
    if (!allBirthdays || allBirthdays.length === 0) {
      toast.info('Aucun anniversaire à exporter')
      return
    }
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      doc.setFontSize(16)
      doc.text('Liste des Anniversaires', 14, 14)
      doc.setFontSize(10)
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 14, 20)

      const headers = ['Nom', 'Prénom', 'Matricule', 'Date de naissance', 'Prochain anniversaire', 'Jours restants', 'Âge']
      const bodyRows = allBirthdays.map((b) => [
        b.lastName || '',
        b.firstName || '',
        b.matricule || '',
        format(new Date(b.birthDate), 'dd/MM/yyyy', { locale: fr }),
        format(b.nextBirthday, 'dd/MM/yyyy', { locale: fr }),
        b.daysUntil.toString(),
        b.age.toString(),
      ])

      autoTable(doc, {
        head: [headers],
        body: bodyRows,
        startY: 26,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      doc.save('anniversaires.pdf')
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }

  return (
    <div className="space-y-6" data-testid="member-birthdays-container">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cake className="h-6 w-6 text-pink-500" />
            Anniversaires des membres
          </h2>
          <p className="text-gray-600 mt-1">
            {groups.today.length > 0
              ? `${groups.today.length} anniversaire${groups.today.length > 1 ? 's' : ''} aujourd'hui 🎉`
              : 'Les anniversaires à venir et récents'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!hasAny}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={!hasAny}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse rounded-2xl border border-gray-100">
              <CardContent className="p-4 md:p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                </div>
                <div className="h-14 rounded-xl bg-gray-100" />
                <div className="h-9 rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !hasAny ? (
        <Card className="rounded-2xl border border-gray-100 shadow-sm">
          <CardContent className="text-center p-12">
            <Cake className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun anniversaire proche</h3>
            <p className="text-gray-600">
              Aucun anniversaire aujourd'hui, cette semaine, à venir ce mois-ci ou récemment passé.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <BirthdaySection title="Aujourd'hui" icon={Cake} accent="text-pink-500" members={groups.today} />
          <BirthdaySection title="Cette semaine" icon={CalendarClock} accent="text-amber-500" members={groups.thisWeek} />
          <BirthdaySection title="À venir ce mois-ci" icon={CalendarDays} accent="text-[#234D65]" members={groups.upcoming} />
          <BirthdaySection title="Passés récemment" icon={History} accent="text-gray-400" members={groups.recentPast} />
        </div>
      )}
    </div>
  )
}
