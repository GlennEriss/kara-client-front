import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useFormContext } from 'react-hook-form'

export default function AmountForm() {
  const { control } = useFormContext()
  
  return (
    <FormField
      control={control}
      name="amount"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Montant à verser *</FormLabel>
          <FormControl>
            <Input 
              type="number" 
              placeholder="Montant en FCFA"
              {...field}
              onChange={(e) => {
                const value = e.target.value
                field.onChange(value ? Number(value) : '')
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
