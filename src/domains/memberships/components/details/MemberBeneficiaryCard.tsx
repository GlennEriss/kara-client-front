'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatBeneficiary } from '@/constantes/beneficiary'
import { getMembershipRequestById } from '@/db/membership.db'
import { UNKNOWN_USER_MATRICULE } from '@/domains/financial/caisse-imprevue/import/unknownUser'
import { useIntermediary } from '@/hooks/useIntermediary'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import BeneficiaryEditDialog from '../form/BeneficiaryEditDialog'

/**
 * Ayant droit d'un membre validé. Il est enregistré sur sa demande d'adhésion
 * (dossier) : on l'y lit, on retrouve le membre par son matricule, et l'admin
 * peut le modifier à tout moment.
 */
export function MemberBeneficiaryCard({ dossierId }: { dossierId?: string | null }) {
  const { data: request, isLoading } = useQuery({
    queryKey: ['membership-beneficiary', dossierId],
    queryFn: () => (dossierId ? getMembershipRequestById(dossierId) : Promise.resolve(null)),
    enabled: !!dossierId,
  })
  const beneficiary = request?.identity?.beneficiary
  const matricule = beneficiary?.matricule
  const isMember = !!matricule && matricule !== UNKNOWN_USER_MATRICULE && !beneficiary?.isUnknown
  const lookup = useIntermediary(isMember ? matricule : undefined)

  if (!dossierId) return null

  let label: string
  if (isLoading || (isMember && lookup.isLoading)) label = 'Chargement…'
  else if (isMember && lookup.data) label = `${lookup.data.firstName} ${lookup.data.lastName} (${matricule})`
  else if (isMember) label = `Aucun membre avec ce matricule (${matricule})`
  else if (beneficiary?.lastName && !beneficiary?.isUnknown && !matricule)
    label = `${formatBeneficiary(beneficiary)} (ancienne saisie, pas un membre)`
  else label = 'INCONNU'

  return (
    <Card className="border-0 bg-gradient-to-br from-violet-50/40 to-purple-50/30 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-violet-600" /> Ayant droit
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-0">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <BeneficiaryEditDialog requestId={dossierId} beneficiary={beneficiary} />
      </CardContent>
    </Card>
  )
}
