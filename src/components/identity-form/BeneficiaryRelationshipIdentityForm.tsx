import SelectApp from '@/components/forms/SelectApp'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { RelationshipEnum } from '@/schemas/emergency-contact.schema'

// Liste dérivée du schéma : elle ne peut pas diverger des valeurs acceptées.
const RELATIONSHIP_OPTIONS = RelationshipEnum.options.map((value) => ({ value, label: value }))

export default function BeneficiaryRelationshipIdentityForm() {
  return (
    <div className="space-y-2 animate-in fade-in-0 slide-in-from-left-4 duration-700 w-full min-w-0">
      <FormField
        name="identity.beneficiary.relationship"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs sm:text-sm font-medium text-[#224D62]">
              Lien de parenté <span className="text-red-500">*</span>
            </FormLabel>

            <FormControl>
              <SelectApp
                options={RELATIONSHIP_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                placeholder="Sélectionner"
              />
            </FormControl>

            <FormMessage className="animate-in slide-in-from-left-2 duration-300 break-words text-xs" />
          </FormItem>
        )}
      />
    </div>
  )
}
