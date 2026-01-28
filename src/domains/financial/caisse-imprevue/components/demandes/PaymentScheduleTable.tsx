/**
 * Composant tableau récapitulatif des versements
 * 
 * Responsive : Mobile (scroll horizontal), Desktop (pleine largeur)
 */

'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PaymentSchedule } from '../../services/DemandSimulationService'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PaymentScheduleTableProps {
  schedule: PaymentSchedule
  className?: string
}

export function PaymentScheduleTable({ schedule, className }: PaymentScheduleTableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mois</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="text-right">Cumulé</TableHead>
            <TableHead className="text-right">Versements</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.items.map((item) => (
            <TableRow key={item.monthIndex}>
              <TableCell>{item.monthIndex}</TableCell>
              <TableCell>{format(item.date, 'dd MMM yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right">
                {item.amount.toLocaleString('fr-FR')} FCFA
              </TableCell>
              <TableCell className="text-right">
                {item.cumulative.toLocaleString('fr-FR')} FCFA
              </TableCell>
              <TableCell className="text-right">{item.paymentCount}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold">
            <TableCell>Total</TableCell>
            <TableCell>{schedule.totalMonths} mois</TableCell>
            <TableCell className="text-right">
              {schedule.totalAmount.toLocaleString('fr-FR')} FCFA
            </TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">{schedule.totalPayments} versements</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
