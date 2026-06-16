'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContractsCIFilters } from '@/hooks/caisse-imprevue/useContractsCI'
import { cn } from '@/lib/utils'
import type { CaisseImprevuePaymentFrequency } from '@/types/types'
import { CONTRACT_CI_STATUS_LABELS, ContractCIStatus } from '@/types/types'
import { ChevronDown, Filter, RefreshCw, Search } from 'lucide-react'
import { useState } from 'react'

interface FiltersCIProps {
  filters: ContractsCIFilters
  onFiltersChange: (filters: ContractsCIFilters) => void
  onReset: () => void
  subscriptions?: Array<{ id: string; code: string; label?: string }>
  /** Quand true, le filtre "Type de contrat" est pris en compte (ex. onglet "Tous"). Quand false, il est masqué ou désactivé (ex. onglet Journalier/Mensuel). */
  showPaymentFrequencyFilter?: boolean
  /** Quand true (onglet retard), la case "Retard uniquement" est forcée et désactivée. */
  isOverdueTab?: boolean
}

const STATUS_LABELS: Record<ContractCIStatus | 'all', string> = {
  all: 'Tous les statuts',
  ...CONTRACT_CI_STATUS_LABELS
}

const PAYMENT_FREQUENCY_LABELS: Record<CaisseImprevuePaymentFrequency | 'all', string> = {
  all: 'Tous les types',
  DAILY: 'Quotidien',
  MONTHLY: 'Mensuel',
}

export default function FiltersCI({
  filters,
  onFiltersChange,
  onReset,
  subscriptions,
  showPaymentFrequencyFilter = true,
  isOverdueTab = false,
}: FiltersCIProps) {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false)

  const safeFilters: ContractsCIFilters = {
    search: filters.search ?? '',
    status: filters.status ?? 'all',
    paymentFrequency: filters.paymentFrequency ?? 'all',
    subscriptionCIID: filters.subscriptionCIID,
    createdAtFrom: filters.createdAtFrom,
    createdAtTo: filters.createdAtTo,
    nextDueAtFrom: filters.nextDueAtFrom,
    nextDueAtTo: filters.nextDueAtTo,
    overdueOnly: filters.overdueOnly ?? false,
    monthlyAmountMin: filters.monthlyAmountMin,
    monthlyAmountMax: filters.monthlyAmountMax,
    contractAmountMin: filters.contractAmountMin,
    contractAmountMax: filters.contractAmountMax,
    paidAmountMin: filters.paidAmountMin,
    paidAmountMax: filters.paidAmountMax,
    durationMonthsMin: filters.durationMonthsMin,
    durationMonthsMax: filters.durationMonthsMax,
    supportRemainingAmountMin: filters.supportRemainingAmountMin,
    supportRemainingAmountMax: filters.supportRemainingAmountMax,
    supportRepaidAmountMin: filters.supportRepaidAmountMin,
    supportRepaidAmountMax: filters.supportRepaidAmountMax,
    supportCountMin: filters.supportCountMin,
    supportCountMax: filters.supportCountMax,
    paymentCountMin: filters.paymentCountMin,
    paymentCountMax: filters.paymentCountMax,
  }

  const isCreatedAtRangeActive = Boolean(safeFilters.createdAtFrom || safeFilters.createdAtTo)
  const isNextDueRangeActive = Boolean(safeFilters.nextDueAtFrom || safeFilters.nextDueAtTo)
  const statusValue: ContractCIStatus | 'all' = safeFilters.status || 'all'
  const paymentFrequencyValue: CaisseImprevuePaymentFrequency | 'all' = safeFilters.paymentFrequency || 'all'

  const selectedSubscription = subscriptions?.find((subscription) => subscription.id === safeFilters.subscriptionCIID)
  const selectedSubscriptionLabel = selectedSubscription
    ? selectedSubscription.label
      ? `${selectedSubscription.code} - ${selectedSubscription.label}`
      : selectedSubscription.code
    : null

  const searchLabel = safeFilters.search?.trim() ? `Recherche: ${safeFilters.search.trim()}` : null
  const paymentFrequencyLabel =
    showPaymentFrequencyFilter && paymentFrequencyValue !== 'all'
      ? `Type: ${PAYMENT_FREQUENCY_LABELS[paymentFrequencyValue]}`
      : null
  const categoryLabel = safeFilters.subscriptionCIID
    ? `Catégorie: ${selectedSubscriptionLabel || safeFilters.subscriptionCIID}`
    : null
  const statusLabel = statusValue !== 'all'
    ? `Statut: ${(statusValue as string) === 'CLOTURE' ? 'Clôturé' : (STATUS_LABELS[statusValue] || statusValue)}`
    : null

  const activeFilterLabels = [
    searchLabel,
    paymentFrequencyLabel,
    categoryLabel,
    statusLabel,
    isCreatedAtRangeActive ? 'Période de création' : null,
    isNextDueRangeActive ? 'Prochaine échéance' : null,
    !isOverdueTab && safeFilters.overdueOnly ? 'Retard uniquement' : null,
    typeof safeFilters.monthlyAmountMin === 'number' || typeof safeFilters.monthlyAmountMax === 'number'
      ? 'Montant à verser'
      : null,
    typeof safeFilters.contractAmountMin === 'number' || typeof safeFilters.contractAmountMax === 'number'
      ? 'Montant contrat'
      : null,
    typeof safeFilters.paidAmountMin === 'number' || typeof safeFilters.paidAmountMax === 'number'
      ? 'Montant déjà versé'
      : null,
    typeof safeFilters.durationMonthsMin === 'number' || typeof safeFilters.durationMonthsMax === 'number'
      ? 'Durée contrat'
      : null,
    typeof safeFilters.supportRemainingAmountMin === 'number' || typeof safeFilters.supportRemainingAmountMax === 'number'
      ? 'Support à rembourser'
      : null,
    typeof safeFilters.supportRepaidAmountMin === 'number' || typeof safeFilters.supportRepaidAmountMax === 'number'
      ? 'Support déjà remboursé'
      : null,
    typeof safeFilters.supportCountMin === 'number' || typeof safeFilters.supportCountMax === 'number'
      ? 'Nombre de supports reçus'
      : null,
    typeof safeFilters.paymentCountMin === 'number' || typeof safeFilters.paymentCountMax === 'number'
      ? 'Nombre de versements effectués'
      : null,
  ].filter(Boolean) as string[]

  const activeFiltersCount = activeFilterLabels.length
  const advancedFiltersCount = activeFilterLabels.filter(
    (label) =>
      label !== (searchLabel || '') &&
      label !== (paymentFrequencyLabel || '') &&
      label !== (categoryLabel || '') &&
      label !== (statusLabel || '')
  ).length
  const controlClassName =
    'h-11 rounded-xl border-2 border-slate-200 bg-white focus:ring-0 focus-visible:ring-0 focus-visible:border-[#234D65]'
  const miniInputClassName =
    'h-10 rounded-lg border-slate-200 bg-white focus-visible:ring-0 focus-visible:border-[#234D65]'

  return (
    <Card className="relative overflow-hidden border border-slate-200/80 bg-white shadow-md">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#234D65] via-[#2c5a73] to-[#cbb171]" />
      <CardContent className="space-y-5 p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] p-2.5 shadow-sm">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Filtres et Recherche</h3>
              <p className="text-sm text-slate-600">Affinez la liste des contrats en quelques critères.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'rounded-full border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700',
                activeFiltersCount === 0 && 'border-slate-200 text-slate-500'
              )}
            >
              {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
            <Button
              variant="outline"
              onClick={() => setIsFiltersExpanded((prev) => !prev)}
              className={cn(
                'h-10 rounded-xl border-2 transition-colors cursor-pointer',
                isFiltersExpanded
                  ? 'border-[#234D65] bg-[#234D65] text-white hover:bg-[#2c5a73]'
                  : 'border-slate-300 text-slate-700 hover:border-[#234D65] hover:bg-[#234D65]/5 hover:text-[#234D65]'
              )}
            >
              Filtres avancés
              {advancedFiltersCount > 0 ? ` (${advancedFiltersCount})` : ''}
              <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', isFiltersExpanded ? 'rotate-180' : '')} />
            </Button>
            <Button
              variant="outline"
              onClick={onReset}
              className="h-10 rounded-xl border-2 border-slate-300 text-slate-700 cursor-pointer hover:border-[#234D65] hover:bg-[#234D65]/5 hover:text-[#234D65]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="space-y-1.5 xl:col-span-5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recherche</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Matricule contrat, membre..."
                className={cn(controlClassName, 'pl-10')}
                value={safeFilters.search || ''}
                onChange={(e) => onFiltersChange({ ...safeFilters, search: e.target.value })}
              />
            </div>
          </div>

          {showPaymentFrequencyFilter && (
            <div className="space-y-1.5 xl:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type de contrat</Label>
              <Select
                value={paymentFrequencyValue}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...safeFilters,
                    paymentFrequency: value as CaisseImprevuePaymentFrequency | 'all',
                  })
                }
              >
                <SelectTrigger className={controlClassName}>
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{PAYMENT_FREQUENCY_LABELS.all}</SelectItem>
                  <SelectItem value="DAILY">{PAYMENT_FREQUENCY_LABELS.DAILY}</SelectItem>
                  <SelectItem value="MONTHLY">{PAYMENT_FREQUENCY_LABELS.MONTHLY}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={cn('space-y-1.5', showPaymentFrequencyFilter ? 'xl:col-span-3' : 'xl:col-span-4')}>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catégorie</Label>
            <Select
              value={safeFilters.subscriptionCIID || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...safeFilters,
                  subscriptionCIID: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {subscriptions?.map((subscription) => (
                  <SelectItem key={subscription.id} value={subscription.id}>
                    {subscription.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={cn('space-y-1.5', showPaymentFrequencyFilter ? 'xl:col-span-2' : 'xl:col-span-3')}>
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</Label>
            <Select
              value={statusValue}
              onValueChange={(value) => onFiltersChange({ ...safeFilters, status: value as ContractCIStatus | 'all' })}
            >
              <SelectTrigger className={controlClassName}>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{STATUS_LABELS.all}</SelectItem>
                <SelectItem value="ACTIVE">{STATUS_LABELS.ACTIVE}</SelectItem>
                <SelectItem value="CLOTURE">Clôturé</SelectItem>
                <SelectItem value="FINISHED">{STATUS_LABELS.FINISHED}</SelectItem>
                <SelectItem value="CANCELED">{STATUS_LABELS.CANCELED}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isFiltersExpanded && (
          <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Période de création</Label>
                  {isNextDueRangeActive && (
                    <span className="text-[11px] font-medium text-slate-500">Désactivé par l&apos;échéance</span>
                  )}
                </div>
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.createdAtFrom ? new Date(safeFilters.createdAtFrom).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        createdAtFrom: e.target.value ? new Date(e.target.value) : undefined,
                        nextDueAtFrom: undefined,
                        nextDueAtTo: undefined,
                      })
                    }
                    disabled={isNextDueRangeActive}
                  />
                  <span className="text-center text-sm text-slate-400">→</span>
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.createdAtTo ? new Date(safeFilters.createdAtTo).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        createdAtTo: e.target.value ? new Date(e.target.value) : undefined,
                        nextDueAtFrom: undefined,
                        nextDueAtTo: undefined,
                      })
                    }
                    disabled={isNextDueRangeActive}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Prochaine échéance</Label>
                  {isCreatedAtRangeActive && (
                    <span className="text-[11px] font-medium text-slate-500">Désactivé par la création</span>
                  )}
                </div>
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.nextDueAtFrom ? new Date(safeFilters.nextDueAtFrom).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        nextDueAtFrom: e.target.value ? new Date(e.target.value) : undefined,
                        createdAtFrom: undefined,
                        createdAtTo: undefined,
                      })
                    }
                    disabled={isCreatedAtRangeActive}
                  />
                  <span className="text-center text-sm text-slate-400">→</span>
                  <Input
                    type="date"
                    className={miniInputClassName}
                    value={safeFilters.nextDueAtTo ? new Date(safeFilters.nextDueAtTo).toISOString().slice(0, 10) : ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...safeFilters,
                        nextDueAtTo: e.target.value ? new Date(e.target.value) : undefined,
                        createdAtFrom: undefined,
                        createdAtTo: undefined,
                      })
                    }
                    disabled={isCreatedAtRangeActive}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <Label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-slate-600">Filtres de montants (FCFA)</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant à verser</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.monthlyAmountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          monthlyAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.monthlyAmountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          monthlyAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant contrat</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.contractAmountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          contractAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.contractAmountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          contractAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montant déjà versé</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.paidAmountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          paidAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.paidAmountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          paidAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Durée contrat (mois)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.durationMonthsMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          durationMonthsMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.durationMonthsMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          durationMonthsMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Support à rembourser</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.supportRemainingAmountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          supportRemainingAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.supportRemainingAmountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          supportRemainingAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Support déjà remboursé</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.supportRepaidAmountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          supportRepaidAmountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.supportRepaidAmountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          supportRepaidAmountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre de supports reçus</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.supportCountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          supportCountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.supportCountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          supportCountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nombre de versements effectués</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Min"
                      className={miniInputClassName}
                      value={safeFilters.paymentCountMin ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          paymentCountMin: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="Max"
                      className={miniInputClassName}
                      value={safeFilters.paymentCountMax ?? ''}
                      onChange={(e) =>
                        onFiltersChange({
                          ...safeFilters,
                          paymentCountMax: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-2 md:flex-row md:items-start md:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-[#234D65] focus:ring-[#234D65]"
                  checked={isOverdueTab ? true : !!safeFilters.overdueOnly}
                  onChange={(e) => onFiltersChange({ ...safeFilters, overdueOnly: e.target.checked })}
                  disabled={isOverdueTab}
                />
                Afficher uniquement les contrats en retard
              </label>

              {activeFilterLabels.length > 0 && (
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {activeFilterLabels.map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="border-[#234D65]/25 bg-[#234D65]/5 px-2.5 py-1 text-xs font-medium text-[#234D65]"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
