'use client'

import { AlertCircle, CheckCircle, CheckCircle2, Clock, CreditCard, Eye, Inbox, Users, XCircle } from 'lucide-react'
import type { MembershipStatistics } from '../../entities'
import { ModernStatsCard } from './MembershipsListStats'

export function MembershipRequestStats({ stats, activeTab, onSelect }: {
  stats: MembershipStatistics
  activeTab: string
  onSelect: (tab: string) => void
}) {
  const cards = [
    { key: 'total', title: 'Total', value: stats.total, color: '#234D65', icon: Users, tab: 'all' },
    { key: 'to_process', title: 'À traiter', value: stats.byStatus.pending + stats.byStatus.under_review, color: '#7c3aed', icon: Inbox },
    { key: 'pending', title: 'En attente', value: stats.byStatus.pending, color: '#d97706', icon: Clock, tab: 'pending' },
    { key: 'under_review', title: 'En cours', value: stats.byStatus.under_review, color: '#0284c7', icon: Eye, tab: 'under_review' },
    { key: 'ready_to_pay', title: 'Complètes', value: stats.byStatus.pending, color: '#059669', icon: CheckCircle2, tab: 'pending', tooltip: 'Demandes en attente, selon le suivi actuel des dossiers.' },
    { key: 'approved', title: 'Approuvées', value: stats.byStatus.approved, color: '#10b981', icon: CheckCircle, tab: 'approved' },
    { key: 'rejected', title: 'Rejetées', value: stats.byStatus.rejected, color: '#ef4444', icon: XCircle, tab: 'rejected' },
    { key: 'paid', title: 'Payées', value: stats.byPayment.paid, color: '#a88b48', icon: CreditCard, tab: 'paid' },
    { key: 'unpaid', title: 'Non payées', value: stats.byPayment.unpaid, color: '#ea580c', icon: AlertCircle, tab: 'unpaid' },
  ]
  return <section aria-label="Statistiques des demandes d’adhésion" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {cards.map(card => <ModernStatsCard key={card.key} title={card.title} value={card.value || 0} icon={card.icon} color={card.color}
      onClick={card.tab ? () => onSelect(card.tab!) : undefined}
      selected={card.key === 'total' ? activeTab === 'all' : card.key === activeTab}
      tooltip={card.tooltip} />)}
  </section>
}
