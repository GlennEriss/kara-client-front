'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StandardSimulation } from '@/types/types'
import {
  WEEKLY_CREDIT_MAX_WEEKS,
  buildWeeklyCreditSimulation,
  computeWeeklyCreditTotals,
} from '@/utils/credit-weekly'
import { format } from 'date-fns'
import { CalendarClock, CheckCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

const toInputDate = (date: Date) => format(date, 'yyyy-MM-dd')

/**
 * Simulation d'un crédit spécial court terme : 1 à 3 semaines, une seule
 * échéance. Le taux est saisi par l'admin et s'applique une fois, sur toute la
 * durée.
 */
export default function WeeklyCreditSimulationPanel({
  isOpen,
  initialAmount,
  lockAmount = false,
  onUse,
}: {
  isOpen: boolean
  initialAmount?: number
  lockAmount?: boolean
  onUse: (simulation: StandardSimulation) => void
}) {
  const [amount, setAmount] = useState<number>(initialAmount || 0)
  const [interestRate, setInterestRate] = useState<number>(0)
  const [weeks, setWeeks] = useState<number>(1)
  const [startDate, setStartDate] = useState<string>(toInputDate(new Date()))

  useEffect(() => {
    if (!isOpen) return
    setAmount(initialAmount || 0)
    setInterestRate(0)
    setWeeks(1)
    setStartDate(toInputDate(new Date()))
  }, [isOpen, initialAmount])

  const simulation = useMemo(() => {
    const start = new Date(startDate)
    if (!amount || amount <= 0 || Number.isNaN(start.getTime())) return null
    return buildWeeklyCreditSimulation({ amount, interestRate, weeks, startDate: start })
  }, [amount, interestRate, weeks, startDate])
  const totals = simulation ? computeWeeklyCreditTotals(simulation.amount, simulation.interestRate) : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crédit court terme (1 à {WEEKLY_CREDIT_MAX_WEEKS} semaines)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weekly-amount">Montant emprunté (FCFA)</Label>
              <Input
                id="weekly-amount"
                type="number"
                min={0}
                value={amount || ''}
                disabled={lockAmount}
                onChange={(event) => setAmount(Number(event.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weekly-rate">Taux d’intérêt sur la durée (%)</Label>
              <Input
                id="weekly-rate"
                type="number"
                min={0}
                step="0.1"
                value={interestRate}
                onChange={(event) => setInterestRate(Number(event.target.value) || 0)}
              />
              <p className="text-xs text-gray-500">Appliqué une seule fois, quelle que soit la durée.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Durée</Label>
              <div className="flex gap-2">
                {Array.from({ length: WEEKLY_CREDIT_MAX_WEEKS }, (_, index) => index + 1).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={weeks === value ? 'default' : 'outline'}
                    className={weeks === value ? 'bg-[#234D65] hover:bg-[#2c5a73]' : ''}
                    onClick={() => setWeeks(value)}
                  >
                    {value} semaine{value > 1 ? 's' : ''}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weekly-start">Date de début</Label>
              <Input id="weekly-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
          </div>

          <Alert>
            <CalendarClock className="h-4 w-4" />
            <AlertDescription>
              Remboursement en une seule fois à la date de fin. En cas de retard, des pénalités
              s’appliquent (3 jours de tolérance), sans intérêts supplémentaires.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {simulation && totals && (
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              Résultat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant emprunté</p>
                <p className="text-sm font-bold">{totals.capital.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Intérêts</p>
                <p className="text-sm font-bold">{totals.interest.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">À rembourser</p>
                <p className="text-sm font-bold text-[#234D65]">{totals.totalAmount.toLocaleString('fr-FR')} FCFA</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Échéance unique</p>
                <p className="text-sm font-bold">{format(simulation.firstPaymentDate, 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <Button
              type="button"
              className="w-full bg-gradient-to-r from-[#234D65] to-[#2c5a73]"
              disabled={!simulation.isValid}
              onClick={() => onUse(simulation)}
            >
              Utiliser cette simulation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
