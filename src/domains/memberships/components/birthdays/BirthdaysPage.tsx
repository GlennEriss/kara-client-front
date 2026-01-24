/**
 * Composant page principal pour la fonctionnalité Anniversaires
 * 
 * Orchestre tous les sous-composants :
 * - BirthdaysSearch : Recherche Algolia
 * - BirthdaysFilters : Filtres par mois
 * - BirthdaysList : Vue liste paginée
 * - BirthdaysCalendar : Vue calendrier mensuel
 */

'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, List, Calendar as CalendarIcon, Cake } from 'lucide-react'
import { useMemberBirthdays } from '../../hooks/useMemberBirthdays'
import { useBirthdaysByMonth } from '../../hooks/useBirthdaysByMonth'
import { BirthdaysSearch } from './BirthdaysSearch'
import { BirthdaysFilters } from './BirthdaysFilters'
import { BirthdaysList } from './BirthdaysList'
import { BirthdaysCalendar } from './BirthdaysCalendar'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

type ViewMode = 'list' | 'calendar'

const MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

export function BirthdaysPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [highlightedMemberId, setHighlightedMemberId] = useState<string | undefined>()

  // Hook pour la liste paginée
  const {
    data: listData,
    pagination,
    isLoading: isLoadingList,
    isError: isErrorList,
    error: listError,
  } = useMemberBirthdays({
    page: currentPage,
    itemsPerPage: 20,
    months: selectedMonths.length > 0 ? selectedMonths : undefined,
    enabled: viewMode === 'list',
  })

  // Hook pour le calendrier
  const {
    data: calendarData,
    isLoading: isLoadingCalendar,
    isError: isErrorCalendar,
    error: calendarError,
  } = useBirthdaysByMonth({
    month: selectedMonth + 1, // 1-12
    year: selectedYear,
    enabled: viewMode === 'calendar',
  })

  // Gestion de la recherche
  const handleSearchSelect = useCallback((memberId: string, birthMonth: number) => {
    setHighlightedMemberId(memberId)
    // Naviguer vers le mois d'anniversaire
    setSelectedMonth(birthMonth - 1) // Convertir 1-12 vers 0-11
    setViewMode('calendar')
    // Scroll vers le membre après un court délai
    setTimeout(() => {
      const element = document.querySelector(`[data-testid="birthday-badge-${memberId}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [])

  // Gestion du changement de mois (calendrier)
  const handleMonthChange = useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    setHighlightedMemberId(undefined) // Réinitialiser la surbrillance
  }, [])

  // Export Excel
  const handleExportExcel = async () => {
    const dataToExport = viewMode === 'list' ? listData : calendarData
    if (!dataToExport || dataToExport.length === 0) {
      toast.info('Aucun anniversaire à exporter')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const rows = dataToExport.map((b) => ({
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
      const filename = `anniversaires_${viewMode === 'calendar' ? `${MONTHS[selectedMonth]}_${selectedYear}` : 'liste'}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  // Export PDF
  const handleExportPdf = async () => {
    const dataToExport = viewMode === 'list' ? listData : calendarData
    if (!dataToExport || dataToExport.length === 0) {
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
      if (viewMode === 'calendar') {
        doc.text(`Mois: ${MONTHS[selectedMonth]} ${selectedYear}`, 14, 20)
      } else {
        doc.text(`Filtres: ${selectedMonths.length > 0 ? selectedMonths.map(m => MONTHS[m - 1]).join(', ') : 'Tous les mois'}`, 14, 20)
      }
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 14, 24)

      const headers = ['Nom', 'Prénom', 'Matricule', 'Date de naissance', 'Prochain anniversaire', 'Jours restants', 'Âge']
      const bodyRows = dataToExport.map((b) => [
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
        startY: 30,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      const filename = `anniversaires_${viewMode === 'calendar' ? `${MONTHS[selectedMonth]}_${selectedYear}` : 'liste'}.pdf`
      doc.save(filename)
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
            {viewMode === 'list'
              ? `${pagination.totalItems} anniversaire${pagination.totalItems > 1 ? 's' : ''}`
              : `${calendarData?.length || 0} anniversaire${(calendarData?.length || 0) > 1 ? 's' : ''} en ${MONTHS[selectedMonth]} ${selectedYear}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Recherche */}
          <BirthdaysSearch onSelectMember={handleSearchSelect} />

          {/* Boutons d'export */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={viewMode === 'list' ? listData.length === 0 : (calendarData?.length || 0) === 0}
              data-testid="member-birthdays-export-excel"
            >
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={viewMode === 'list' ? listData.length === 0 : (calendarData?.length || 0) === 0}
              data-testid="member-birthdays-export-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>

          {/* Toggle vue */}
          <div className="flex items-center gap-1 border rounded-lg p-1" data-testid="member-birthdays-view-toggle">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="member-birthdays-view-toggle-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              data-testid="member-birthdays-view-toggle-calendar"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filtres (uniquement pour la vue liste) */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-4">
            <BirthdaysFilters
              selectedMonths={selectedMonths}
              onMonthsChange={(months) => {
                setSelectedMonths(months)
                setCurrentPage(1) // Réinitialiser à la page 1
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Contenu */}
      {viewMode === 'list' ? (
        <>
          {isErrorList ? (
            <Card>
              <CardContent className="text-center p-12">
                <p className="text-red-600">Erreur lors du chargement : {String(listError)}</p>
              </CardContent>
            </Card>
          ) : (
            <BirthdaysList
              members={listData}
              pagination={pagination}
              isLoading={isLoadingList}
              onPageChange={setCurrentPage}
              highlightedMemberId={highlightedMemberId}
            />
          )}
        </>
      ) : (
        <>
          {isErrorCalendar ? (
            <Card>
              <CardContent className="text-center p-12">
                <p className="text-red-600">Erreur lors du chargement : {String(calendarError)}</p>
              </CardContent>
            </Card>
          ) : (
            <BirthdaysCalendar
              members={calendarData || []}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={handleMonthChange}
              highlightedMemberId={highlightedMemberId}
              isLoading={isLoadingCalendar}
            />
          )}
        </>
      )}
    </div>
  )
}
