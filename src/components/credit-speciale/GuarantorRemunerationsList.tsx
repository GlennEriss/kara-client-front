'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { useGuarantorRemunerationsByGuarantorId } from '@/hooks/useCreditSpeciale'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface GuarantorRemunerationsListProps {
  guarantorId: string
}

export default function GuarantorRemunerationsList({ guarantorId }: GuarantorRemunerationsListProps) {
  const { data: remunerations, isLoading } = useGuarantorRemunerationsByGuarantorId(guarantorId)

  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rémunérations de garant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!remunerations || remunerations.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rémunérations de garant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune rémunération enregistrée pour ce garant.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Calculer les statistiques
  const totalAmount = remunerations.reduce((sum, r) => sum + r.amount, 0)
  const totalRemunerations = remunerations.length
  const averageAmount = totalRemunerations > 0 ? totalAmount / totalRemunerations : 0

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Total rémunérations</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{totalRemunerations}</p>
              </div>
              <div className="p-3 rounded-full bg-green-200">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Montant total</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {totalAmount.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-200">
                <TrendingUp className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Moyenne par rémunération</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {Math.round(averageAmount).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-200">
                <FileText className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des rémunérations */}
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historique des rémunérations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Mois</TableHead>
                  <TableHead>Contrat</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remunerations.map((remuneration) => (
                  <TableRow key={remuneration.id}>
                    <TableCell>
                      {format(new Date(remuneration.createdAt), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        Mois {remuneration.month}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {remuneration.creditId.slice(-8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {remuneration.amount.toLocaleString('fr-FR')} FCFA
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

