'use client'
import { useAuth } from '@/hooks/useAuth'
import { useMyAccess } from '@/hooks/useMyAccess'
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
      loadMembers={async (search) =>
        (await getMembers({ searchQuery: search }, 1, 30)).data.map((m) => ({
          value: m.id,
          label: `${m.firstName} ${m.lastName} · ${m.matricule}`,
        }))
      }
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
