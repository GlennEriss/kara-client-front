'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { useMemberWithFilleuls } from '@/hooks/filleuls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  User as UserIcon, 
  Loader2, 
  AlertCircle, 
  ArrowLeft,
  Calendar,
  UserCheck,
  TrendingUp,
  RefreshCw,
  Download,
  FileText
} from 'lucide-react'
import { Filleul } from '@/types/types'
import { cn } from '@/lib/utils'
import routes from '@/constantes/routes'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function FilleulsList() {
  const params = useParams()
  const memberId = params.id as string
  
  // Utiliser les hooks React Query pour récupérer le membre et ses filleuls
  const { member, filleuls, isLoading, isError, error } = useMemberWithFilleuls(memberId)

  // États de chargement et d'erreur
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Liste des Filleuls
            </h1>
            <p className="text-gray-600 text-lg">
              Erreur lors du chargement des données
            </p>
          </div>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-600 mb-4">
              {error?.message || 'Impossible de charger la liste des filleuls'}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérifier si le membre existe
  if (!member.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              Liste des Filleuls
            </h1>
            <p className="text-gray-600 text-lg">
              Membre non trouvé
            </p>
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-orange-800 mb-2">
              Membre introuvable
            </h3>
            <p className="text-orange-600 mb-4">
              Le membre avec l'ID "{memberId}" n'existe pas dans notre base de données.
            </p>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filleulsData: Filleul[] = (filleuls.data as Filleul[]) || []
  const memberData = member.data!

  // Calculer les statistiques
  const totalFilleuls = filleulsData.length
  const thisYear = filleulsData.filter(f => 
    new Date(f.createdAt).getFullYear() === new Date().getFullYear()
  ).length
  const thisMonth = filleulsData.filter(f => {
    const now = new Date()
    const filleulDate = new Date(f.createdAt)
    return filleulDate.getFullYear() === now.getFullYear() && 
           filleulDate.getMonth() === now.getMonth()
  }).length

  // Export Excel
  const handleExportExcel = async () => {
    if (filleulsData.length === 0) {
      toast.info('Aucun filleul à exporter')
      return
    }

    try {
      const XLSX = await import('xlsx')
      const rows = filleulsData.map((filleul) => ({
        'Nom': filleul.lastName || '',
        'Prénom': filleul.firstName || '',
        'Matricule': filleul.matricule || '',
        'Date d\'adhésion': format(new Date(filleul.createdAt), 'dd/MM/yyyy', { locale: fr }),
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Filleuls')
      const filename = `filleuls_${memberData.matricule}_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.xlsx`
      XLSX.writeFile(workbook, filename)
      toast.success('Export Excel généré avec succès')
    } catch (error) {
      console.error('Erreur export Excel:', error)
      toast.error("Erreur lors de l'export Excel")
    }
  }

  // Export PDF
  const handleExportPdf = async () => {
    if (filleulsData.length === 0) {
      toast.info('Aucun filleul à exporter')
      return
    }

    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF('landscape')

      // En-tête
      doc.setFontSize(16)
      doc.text('Liste des Filleuls', 14, 14)
      doc.setFontSize(10)
      doc.text(`Parrain: ${memberData.firstName} ${memberData.lastName} (${memberData.matricule})`, 14, 20)
      doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, 14, 24)
      doc.text(`Total: ${filleulsData.length} filleul${filleulsData.length > 1 ? 's' : ''}`, 14, 28)

      // Tableau
      const headers = ['Nom', 'Prénom', 'Matricule', 'Date d\'adhésion']
      const bodyRows = filleulsData.map((filleul) => [
        filleul.lastName || '',
        filleul.firstName || '',
        filleul.matricule || '',
        format(new Date(filleul.createdAt), 'dd/MM/yyyy', { locale: fr }),
      ])

      autoTable(doc, {
        head: [headers],
        body: bodyRows,
        startY: 35,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [35, 77, 101], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      const filename = `filleuls_${memberData.matricule}_${format(new Date(), 'yyyy-MM-dd', { locale: fr })}.pdf`
      doc.save(filename)
      toast.success('Export PDF généré avec succès')
    } catch (error) {
      console.error('Erreur export PDF:', error)
      toast.error("Erreur lors de l'export PDF")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header : en mobile = 6 lignes (titre, photo+Parrain, nom, prénom, matricule, boutons) ; en desktop = disposition horizontale */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          {/* Ligne 1 : Liste des Filleuls */}
          <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
            Liste des Filleuls
          </h1>

          {/* Lignes 2 à 5 (mobile) / bloc compact (desktop) : Photo + Parrain, Nom, Prénom, Matricule */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            {/* Ligne 2 : Photo et Parrain */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={memberData.photoURL || undefined} alt={`Photo de ${memberData.firstName} ${memberData.lastName}`} />
                <AvatarFallback className="bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white">
                  <UserIcon className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-600 font-medium">Parrain</span>
            </div>
            {/* Ligne 3 : Nom */}
            <p className="font-semibold text-lg text-[#234D65]">{memberData.lastName}</p>
            {/* Ligne 4 : Prénom */}
            <p className="text-gray-700 text-lg">{memberData.firstName}</p>
            {/* Ligne 5 : Matricule */}
            <Badge variant="secondary" className="w-fit bg-[#234D65]/10 text-[#234D65] border-[#234D65]/20">
              {memberData.matricule}
            </Badge>
          </div>
        </div>

        {/* Ligne 6 (mobile) : boutons PDF, Excel, Retour */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {filleulsData.length > 0 && (
            <>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
              >
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={handleExportPdf}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </>
          )}
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="border-[#234D65]/20 text-[#234D65] hover:bg-[#234D65]/5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-[#234D65]/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total des Filleuls</p>
                <p className="text-2xl font-bold text-[#234D65]">{totalFilleuls}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#234D65]/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cette Année</p>
                <p className="text-2xl font-bold text-green-600">{thisYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#234D65]/20 hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ce Mois</p>
                <p className="text-2xl font-bold text-blue-600">{thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des filleuls */}
      {filleulsData.length === 0 ? (
        <Card className="border-[#234D65]/20">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-gray-100">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Aucun filleul trouvé
                </h3>
                <p className="text-gray-600">
                  Ce membre n'a pas encore de filleuls enregistrés.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filleulsData.map((filleul: Filleul, index: number) => (
            <Card 
              key={`${filleul.matricule}-${index}`} 
              className="border-[#234D65]/20 hover:shadow-lg transition-all duration-300 hover:border-[#234D65]/40 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={filleul.photoURL || undefined} alt={`Photo de ${filleul.firstName} ${filleul.lastName}`} />
                    <AvatarFallback className="bg-gradient-to-br from-[#234D65] to-[#2c5a73] text-white">
                      <UserIcon className="w-7 h-7" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-[#234D65] truncate group-hover:text-[#2c5a73] transition-colors">
                          {filleul.firstName} {filleul.lastName}
                        </h3>
                        <Badge 
                          variant="secondary" 
                          className="mt-1 bg-[#234D65]/10 text-[#234D65] border-[#234D65]/20 text-xs"
                        >
                          {filleul.matricule}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Membre depuis le {filleul.createdAt.toLocaleDateString('fr-FR')}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <UserCheck className="w-4 h-4" />
                        <span>Statut: Actif</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}