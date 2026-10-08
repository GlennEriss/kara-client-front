'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreditShopPurchase, StandardSimulation } from '@/types/types'
import { addContractMonths } from '@/utils/contract-months'
import { useShopCreditPartner } from '@/hooks/useShops'
import {
  SHOP_CREDIT_INSTALLMENT_OPTIONS,
  applyShopPartnerTerms,
  buildShopCreditSimulation,
  computeWeeklyCreditTotals,
  splitFlatInstallments,
} from '@/utils/credit-weekly'
import { format } from 'date-fns'
import { CalendarClock, CheckCircle, Store } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const toInputDate = (date: Date) => format(date, 'yyyy-MM-dd')

const inOneMonth = () => addContractMonths(new Date(), 1)

/**
 * Simulation d'un achat à crédit en boutique partenaire : le montant est le
 * prix de l'article, le taux saisi par l'admin s'applique une fois, et le total
 * se rembourse en 2 ou 3 mensualités égales.
 */
export default function ShopCreditSimulationPanel({
  isOpen,
  purchase: rawPurchase,
  onUse,
}: {
  isOpen: boolean
  purchase: CreditShopPurchase
  onUse: (simulation: StandardSimulation) => void
}) {
  // Demande saisie par un membre : la remise vient de la convention de la boutique.
  const { data: partner } = useShopCreditPartner(rawPurchase.shopId)
  const purchase = applyShopPartnerTerms(rawPurchase, partner)
  const [interestRate, setInterestRate] = useState<number>(0)
  const [months, setMonths] = useState<number>(3)
  const [firstDate, setFirstDate] = useState<string>(toInputDate(inOneMonth()))

  useEffect(() => {
    if (!isOpen) return
    setInterestRate(0)
    setMonths(3)
    setFirstDate(toInputDate(inOneMonth()))
  }, [isOpen])

  const simulation = useMemo(() => {
    const first = new Date(firstDate)
    if (!purchase.price || Number.isNaN(first.getTime())) return null
    return buildShopCreditSimulation({ amount: purchase.price, interestRate, months, firstPaymentDate: first })
  }, [purchase.price, interestRate, months, firstDate])
  const totals = simulation ? computeWeeklyCreditTotals(simulation.amount, simulation.interestRate) : null
  const schedule = simulation ? splitFlatInstallments(simulation.totalAmount, simulation.duration) : []
  const discount = purchase.price - purchase.vendorAmount

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-600" />
            Achat en boutique : {purchase.shopName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-emerald-50/70 p-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-emerald-700">Article</p>
              <p className="font-semibold text-emerald-950">{purchase.article}</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Prix financé</p>
              <p className="font-semibold text-emerald-950">{purchase.price.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div>
              <p className="text-xs text-emerald-700">Versé au vendeur (remise {purchase.discountPercent} %)</p>
              <p className="font-semibold text-emerald-950">
                {purchase.vendorAmount.toLocaleString('fr-FR')} FCFA
                <span className="ml-1 text-xs font-normal text-emerald-700">(−{discount.toLocaleString('fr-FR')})</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="shop-rate">Taux d’intérêt sur la durée (%)</Label>
              <Input
                id="shop-rate"
                type="number"
                min={0}
                step="0.1"
                value={interestRate}
                onChange={(event) => setInterestRate(Number(event.target.value) || 0)}
              />
              <p className="text-xs text-gray-500">Appliqué une seule fois, quelle que soit la durée.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre de mensualités</Label>
              <div className="flex gap-2">
                {SHOP_CREDIT_INSTALLMENT_OPTIONS.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={months === value ? 'default' : 'outline'}
                    className={months === value ? 'bg-[#234D65] hover:bg-[#2c5a73]' : ''}
                    onClick={() => setMonths(value)}
                  >
                    {value} mois
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shop-first">Première mensualité</Label>
              <Input id="shop-first" type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} />
            </div>
          </div>

          <Alert>
            <CalendarClock className="h-4 w-4" />
            <AlertDescription>
              Mensualités égales, sans intérêts supplémentaires. En cas de retard, des pénalités s’appliquent. Ni
              mois de repos, ni rajout.
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Montant financé</p>
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Gain de l’association</p>
                <p className="text-sm font-bold text-emerald-700">
                  {(totals.interest + discount).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Mensualité</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((amount, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2">M{index + 1}</td>
                      <td className="px-3 py-2">
                        {format(addContractMonths(simulation.firstPaymentDate, index), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">{amount.toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
