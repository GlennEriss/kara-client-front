'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useQuarterMutations, useDistricts } from '@/hooks/useGeographie'
import { quarterSchema, type QuarterFormData } from '@/schemas/geographie.schema'
import type { Quarter } from '@/types/types'

interface AddQuarterModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newQuarter: Quarter) => void
  districtId?: string // District pré-sélectionné si disponible
}

export default function AddQuarterModal({ open, onClose, onSuccess, districtId }: AddQuarterModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const quarterMutations = useQuarterMutations()
  
  const form = useForm<QuarterFormData>({
    resolver: zodResolver(quarterSchema),
    defaultValues: {
      name: '',
      districtId: districtId || '',
    }
  })

  const selectedDistrictId = form.watch('districtId')
  const { data: districts = [] } = useDistricts(districtId)

  // Trier les districts par ordre alphabétique
  const sortedDistricts = useMemo(() => {
    return [...districts].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [districts])

  // Mettre à jour districtId si fourni en prop
  useEffect(() => {
    if (districtId && !form.getValues('districtId')) {
      form.setValue('districtId', districtId)
    }
  }, [districtId, form])

  const handleSubmit = async (data: QuarterFormData) => {
    setIsSubmitting(true)
    try {
      const newQuarter = await quarterMutations.create.mutateAsync(data)
      onSuccess(newQuarter)
      form.reset()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la création du quartier:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau quartier</DialogTitle>
          <DialogDescription>
            Créez rapidement un nouveau quartier sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="districtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrondissement <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!districtId || districts.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={districtId ? "Arrondissement pré-sélectionné" : "Sélectionnez un arrondissement"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedDistricts.map((district) => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du quartier <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Glass" 
                      {...field} 
                      autoFocus
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
              <Button type="submit" disabled={isSubmitting || !selectedDistrictId}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

