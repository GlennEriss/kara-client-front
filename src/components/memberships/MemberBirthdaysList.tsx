'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cake,
  List,
  Download,
  AlertCircle,
  Search,
} from 'lucide-react'
import { MemberWithSubscription, getMembers } from '@/db/member.db'
import { toast } from 'sonner'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDaysInMonth, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { UserFilters } from '@/types/types'

type ViewMode = 'list' | 'calendar'

interface BirthdayMember {
  member: MemberWithSubscription
  birthDate: Date
  nextBirthday: Date
  daysUntil: number
  age: number
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export default function MemberBirthdaysList() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // États pour charger tous les membres par pagination
  const [allMembers, setAllMembers] = useState<MemberWithSubscription[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [loadError, setLoadError] = useState<Error | null>(null)

  // Charger tous les membres par pagination (pour éviter la limite Firestore de 10000)
  useEffect(() => {
    const loadAllMembers = async () => {
      setIsLoadingMembers(true)
      setLoadError(null)
      const collected: MemberWithSubscription[] = []
      let page = 1
      const pageSize = 1000 // Limite raisonnable par page

      try {
        for (;;) {
          const res = await getMembers({} as UserFilters, page, pageSize)
          const batch = (res?.data || []) as MemberWithSubscription[]
          if (batch.length === 0) break

          collected.push(...batch)

          if (!res?.pagination?.hasNextPage) break
          page += 1

          // Sécurité : limiter à 10 pages max (10 000 membres max)
          if (page > 10) break
        }

        setAllMembers(collected)
      } catch (error) {
        console.error('Erreur lors du chargement des membres:', error)
        setLoadError(error as Error)
        toast.error('Erreur lors du chargement des membres')
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadAllMembers()
  }, [])

  // Calculer les anniversaires
  const birthdays = useMemo(() => {
    if (allMembers.length === 0) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const birthdayMembers: BirthdayMember[] = []

    for (const member of allMembers) {
      const birthDateStr = (member as any).birthDate
      if (!birthDateStr) continue

      try {
        const birthDate = new Date(birthDateStr)
        if (isNaN(birthDate.getTime())) continue

        const currentYear = today.getFullYear()
        const birthMonth = birthDate.getMonth()
        const birthDay = birthDate.getDate()

        // Calculer le prochain anniversaire
        let nextBirthday = new Date(currentYear, birthMonth, birthDay)
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
        }

        const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const age = currentYear - birthDate.getFullYear() - (nextBirthday < today ? 0 : 1)

        birthdayMembers.push({
          member,
          birthDate,
          nextBirthday,
          daysUntil,
          age,
        })
      } catch {
        continue
      }
    }

    // Trier par jours jusqu'à l'anniversaire (plus proche en premier)
    return birthdayMembers.sort((a, b) => a.daysUntil - b.daysUntil)
  }, [allMembers])

  // Filtrer par mois sélectionné
  const filteredByMonth = useMemo(() => {
    if (viewMode === 'calendar') {
      return birthdays.filter((b) => {
        const birthdayMonth = b.nextBirthday.getMonth()
        const birthdayYear = b.nextBirthday.getFullYear()
        return birthdayMonth === selectedMonth && birthdayYear === selectedYear
      })
    }
    return birthdays
  }, [birthdays, selectedMonth, selectedYear, viewMode])

  // Filtrer par recherche
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return filteredByMonth

    const query = searchQuery.toLowerCase().trim()
    return filteredByMonth.filter((b) => {
      const firstName = (b.member.firstName || '').toLowerCase()
      const lastName = (b.member.lastName || '').toLowerCase()
      const matricule = (b.member.matricule || '').toLowerCase()
      return firstName.includes(query) || lastName.includes(query) || matricule.includes(query)
    })
  }, [filteredByMonth, searchQuery])

  // Pagination pour la vue liste
  const paginated = useMemo(() => {
    if (viewMode === 'calendar') return filtered
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, viewMode])

  // Grouper par jour pour le calendrier
  const calendarDays = useMemo(() => {
    if (viewMode !== 'calendar') return []

    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth, 1))
    const monthEnd = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    return days.map((day) => {
      const dayBirthdays = filtered.filter((b) => isSameDay(b.nextBirthday, day))
      return {
        date: day,
        birthdays: dayBirthdays,
      }
    })
  }, [filtered, selectedMonth, selectedYear, viewMode])

  // Gérer le changement de mois
  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  // Export Excel
  const handleExportExcel = async () => {
    if (filtered.length === 0) {
      toast.info('Aucun anniversaire à exporter')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const rows = filtered.map((b) => ({
        'Nom': b.member.lastName || '',
        'Prénom': b.member.firstName || '',
        'Matricule': b.member.matricule || '',
        'Date de naissance': format(b.birthDate, 'dd/MM/yyyy', { locale: fr }),
        'Prochain anniversaire': format(b.nextBirthday, 'dd/MM/yyyy', { locale: fr }),
        'Jours restants': b.daysUntil,
        'Âge': b.age,
        'Téléphones': Array.isArray(b.member.contacts) ? b.member.contacts.join(' | ') : '',
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Anniversaires')
      const filename = `anniversaires_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Export Excel généré')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  // Export PDF
  const handleExportPdf = async () => {
    if (filtered.length === 0) {
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
      doc.text(`Mois: ${MONTHS[selectedMonth]} ${selectedYear}`, 14, 20)
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 14, 24)

      const headers = ['Nom', 'Prénom', 'Matricule', 'Date de naissance', 'Prochain anniversaire', 'Jours restants', 'Âge']
      const bodyRows = filtered.map((b) => [
        b.member.lastName || '',
        b.member.firstName || '',
        b.member.matricule || '',
        format(b.birthDate, 'dd/MM/yyyy', { locale: fr }),
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

      const filename = `anniversaires_${MONTHS[selectedMonth]}_${selectedYear}.pdf`
      doc.save(filename)
      toast.success('Export PDF généré')
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }

  const isLoading = isLoadingMembers
  const error = loadError

  if (error) {
    return (
      <Alert className="border-0 bg-gradient-to-r from-red-50 to-rose-50 shadow-lg">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-700 font-medium">
          Une erreur est survenue lors du chargement des membres.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cake className="h-6 w-6 text-pink-500" />
            Anniversaires des membres
          </h2>
          <p className="text-gray-600 mt-1">
            {filtered.length} anniversaire(s) {viewMode === 'calendar' && `en ${MONTHS[selectedMonth]} ${selectedYear}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Recherche */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom, prénom ou matricule"
              className="pl-9 pr-3 h-9"
            />
          </div>

          {/* Sélection du mois (pour calendrier) */}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleMonthChange('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {month} {selectedYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => handleMonthChange('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Boutons d'export */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>

          {/* Toggle vue */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <>
          {paginated.length > 0 ? (
            <div className="space-y-3">
              {paginated.map((b, idx) => (
                <Card key={`${b.member.id}-${idx}`} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                          <Cake className="h-6 w-6 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">
                            {b.member.firstName} {b.member.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Matricule: {b.member.matricule} • {format(b.nextBirthday, 'dd MMMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant={b.daysUntil === 0 ? 'default' : b.daysUntil <= 2 ? 'secondary' : 'outline'}>
                          {b.daysUntil === 0 ? "Aujourd'hui" : b.daysUntil === 1 ? 'Demain' : `J-${b.daysUntil}`}
                        </Badge>
                        <span className="text-sm text-gray-500">({b.age} ans)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center p-12">
                <Cake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun anniversaire trouvé</h3>
                <p className="text-gray-600">
                  {searchQuery ? 'Aucun membre ne correspond à votre recherche.' : 'Aucun anniversaire pour cette période.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Pagination */}
          {filtered.length > itemsPerPage && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} sur {Math.ceil(filtered.length / itemsPerPage)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{MONTHS[selectedMonth]} {selectedYear}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {/* En-têtes des jours */}
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}

              {/* Jours du mois */}
              {calendarDays.map((dayData, idx) => {
                const day = dayData.date
                const isToday = isSameDay(day, new Date())
                const hasBirthday = dayData.birthdays.length > 0

                return (
                  <div
                    key={idx}
                    className={`
                      min-h-[80px] p-2 border rounded-lg
                      ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}
                      ${hasBirthday ? 'bg-pink-50 border-pink-300' : ''}
                    `}
                  >
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {format(day, 'd')}
                    </div>
                    {hasBirthday && (
                      <div className="space-y-1">
                        {dayData.birthdays.slice(0, 2).map((b, bidx) => (
                          <div
                            key={bidx}
                            className="text-xs bg-pink-200 text-pink-800 px-1 py-0.5 rounded truncate"
                            title={`${b.member.firstName} ${b.member.lastName}`}
                          >
                            {b.member.firstName} {b.member.lastName.charAt(0)}.
                          </div>
                        ))}
                        {dayData.birthdays.length > 2 && (
                          <div className="text-xs text-pink-600 font-medium">
                            +{dayData.birthdays.length - 2} autre(s)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

