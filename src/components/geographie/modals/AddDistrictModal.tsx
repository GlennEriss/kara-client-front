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
import { useDistrictMutations, useCommunes } from '@/hooks/useGeographie'
import { districtSchema, type DistrictFormData } from '@/schemas/geographie.schema'
import type { District } from '@/types/types'

interface AddDistrictModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newDistrict: District) => void
  communeId?: string // Commune pré-sélectionnée si disponible
}

export default function AddDistrictModal({ open, onClose, onSuccess, communeId }: AddDistrictModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const districtMutations = useDistrictMutations()
  
  const form = useForm<DistrictFormData>({
    resolver: zodResolver(districtSchema),
    defaultValues: {
      name: '',
      communeId: communeId || '',
    }
  })

  const selectedCommuneId = form.watch('communeId')
  const { data: communes = [] } = useCommunes(communeId)

  // Trier les communes par ordre alphabétique
  const sortedCommunes = useMemo(() => {
    return [...communes].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [communes])

  // Mettre à jour communeId si fourni en prop
  useEffect(() => {
    if (communeId && !form.getValues('communeId')) {
      form.setValue('communeId', communeId)
    }
  }, [communeId, form])

  const handleSubmit = async (data: DistrictFormData) => {
    setIsSubmitting(true)
    try {
      const newDistrict = await districtMutations.create.mutateAsync(data)
      onSuccess(newDistrict)
      form.reset()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'arrondissement:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel arrondissement</DialogTitle>
          <DialogDescription>
            Créez rapidement un nouvel arrondissement sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="communeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commune <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!communeId || communes.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={communeId ? "Commune pré-sélectionnée" : "Sélectionnez une commune"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedCommunes.map((commune) => (
                        <SelectItem key={commune.id} value={commune.id}>
                          {commune.name}
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
                  <FormLabel>Nom de l'arrondissement <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Akanda" 
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
              <Button type="submit" disabled={isSubmitting || !selectedCommuneId}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

