'use client'
import { useAuth } from '@/hooks/useAuth'
import { useMyAccess } from '@/hooks/useMyAccess'
import { getAdmins } from '@/db/admin.db'
import { getMembers } from '@/db/member.db'
import { VehicleInsuranceRepository } from '@/repositories/vehicule/VehicleInsuranceRepository'
import {
  insuranceMatchesProspect,
  type InsuranceProspect,
} from '@/domains/insurance-prospects/model'
import { ProspectsPage } from '@/domains/insurance-prospects/ProspectsPage'

export function AdminProspectsPage() {
  const { user } = useAuth(),
    { can } = useMyAccess()
  if (!user) return <p>Chargement…</p>
  if (!can('vehicules.view')) return <p>Accès non autorisé.</p>
  return (
    <ProspectsPage
      actor={{
        id: user.uid,
        name: user.displayName || user.email || 'Administration',
        admin: true,
      }}
      canCreate={can('vehicules.create')}
      canEdit={can('vehicules.edit')}
      loadMembers={async (search) => {
        const [members, staff] = await Promise.all([
          getMembers({ searchQuery: search }, 1, 30),
          getAdmins({ roles: ['AgentProspection'] }, 1, 100),
        ])
        const query = search.trim().toLocaleLowerCase('fr')
        return [
          ...staff.data.filter(agent => agent.isActive && [agent.id, agent.firstName, agent.lastName].join(' ').toLocaleLowerCase('fr').includes(query))
            .map(agent => ({ value: agent.id, label: `${agent.firstName} ${agent.lastName} · Agent de prospection` })),
          ...members.data.map(member => ({ value: member.id, label: `${member.firstName} ${member.lastName} · ${member.matricule}` })),
        ]
      }}
      loadInsurances={async (row: InsuranceProspect) => {
        const result = await new VehicleInsuranceRepository().list(
          {
            sponsorMemberId: row.sponsorMemberId,
            searchQuery: row.plateNumber,
          },
          1,
          1000,
        )
        return result.items
          .filter((i) => insuranceMatchesProspect(row, i))
          .map((i) => ({
            value: i.id,
            label: `${i.plateNumber} · ${i.insuranceCompany} · ${i.policyNumber}`,
          }))
      }}
      insuranceCreateUrl={() => '/vehicules'}
    />
  )
}
