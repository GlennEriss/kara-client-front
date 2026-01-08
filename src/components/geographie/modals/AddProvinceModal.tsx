'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useProvinceMutations } from '@/hooks/useGeographie'
import { provinceSchema, type ProvinceFormData } from '@/schemas/geographie.schema'
import type { Province } from '@/types/types'

interface AddProvinceModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newProvince: Province) => void
}

export default function AddProvinceModal({ open, onClose, onSuccess }: AddProvinceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const provinceMutations = useProvinceMutations()
  
  const form = useForm<ProvinceFormData>({
    resolver: zodResolver(provinceSchema),
    defaultValues: {
      name: '',
      code: '',
    }
  })

  const handleSubmit = async (data: ProvinceFormData) => {
    setIsSubmitting(true)
    try {
      const newProvince = await provinceMutations.create.mutateAsync(data)
      // Le toast de succès est déjà géré par le hook
      onSuccess(newProvince)
      form.reset()
      onClose()
    } catch (error: any) {
      // Le toast d'erreur est géré par le hook
      console.error('Erreur lors de la création de la province:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle province</DialogTitle>
          <DialogDescription>
            Créez rapidement une nouvelle province sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la province <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Estuaire" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: EST" 
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

