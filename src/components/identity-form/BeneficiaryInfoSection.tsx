import BeneficiaryFirstNameIdentityForm from '@/components/identity-form/BeneficiaryFirstNameIdentityForm'
import BeneficiaryIdNumberIdentityForm from '@/components/identity-form/BeneficiaryIdNumberIdentityForm'
import BeneficiaryLastNameIdentityForm from '@/components/identity-form/BeneficiaryLastNameIdentityForm'
import BeneficiaryPhoneIdentityForm from '@/components/identity-form/BeneficiaryPhoneIdentityForm'
import BeneficiaryRelationshipIdentityForm from '@/components/identity-form/BeneficiaryRelationshipIdentityForm'
import { Label } from '@/components/ui/label'
import { ShieldCheck } from 'lucide-react'

/**
 * Bénéficiaire désigné (ayant-droit) — section 3 de l'engagement d'adhésion.
 *
 * Obligatoire : `identitySchema` exige `beneficiary.lastName` et
 * `beneficiary.phone`. Sans cette section, l'étape 1 ne peut pas être validée.
 */
export default function BeneficiaryInfoSection() {
  return (
    <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500 w-full">
      <div className="flex items-start space-x-2 px-4 py-2 bg-gradient-to-r from-[#CBB171]/10 to-[#224D62]/10 rounded-lg border border-[#CBB171]/30">
        <ShieldCheck className="w-5 h-5 text-[#224D62] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <Label className="text-sm font-bold text-[#224D62]">
            Bénéficiaire désigné (ayant-droit) <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-[#224D62]/70 break-words">
            Personne à qui l&apos;allocation de secours sera versée en cas de décès du membre
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <BeneficiaryLastNameIdentityForm />
        <BeneficiaryFirstNameIdentityForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <BeneficiaryRelationshipIdentityForm />
        <BeneficiaryIdNumberIdentityForm />
      </div>

      <BeneficiaryPhoneIdentityForm />
    </div>
  )
}
