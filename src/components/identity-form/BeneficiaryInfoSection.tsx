import BeneficiaryMemberField from '@/domains/memberships/components/form/BeneficiaryMemberField'

/**
 * Ayant droit (bénéficiaire désigné) — section 3 de l'engagement d'adhésion.
 * Un membre de LE KARA choisi par son matricule ; facultatif : sans ayant
 * droit, le membre « INCONNU » est enregistré.
 */
export default function BeneficiaryInfoSection() {
  return (
    <div className="w-full rounded-lg border border-[#CBB171]/30 bg-gradient-to-r from-[#CBB171]/10 to-[#224D62]/10 p-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <BeneficiaryMemberField />
    </div>
  )
}
