'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useCreateProfession } from '@/hooks/useCompany'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

const professionFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  category: z.string().optional(),
})

type ProfessionFormData = z.infer<typeof professionFormSchema>

interface AddProfessionModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (professionName: string) => void
}

export default function AddProfessionModal({ open, onClose, onSuccess }: AddProfessionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createProfession = useCreateProfession()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const form = useForm<ProfessionFormData>({
    resolver: zodResolver(professionFormSchema),
    defaultValues: {
      name: '',
      category: '',
    }
  })

  const handleSubmit = async (data: ProfessionFormData) => {
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    setIsSubmitting(true)
    try {
      // Construire additionalData en excluant les valeurs vides/undefined
      const additionalData: { category?: string } = {}
      if (data.category && data.category.trim()) {
        additionalData.category = data.category.trim()
      }

      await createProfession.mutateAsync({
        professionName: data.name,
        adminId: user.uid,
        additionalData: Object.keys(additionalData).length > 0 ? additionalData : undefined
      })
      
      // Invalider le cache des professions
      queryClient.invalidateQueries({ queryKey: ['professions'] })
      
      toast.success('Profession créée avec succès')
      onSuccess(data.name)
      form.reset()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de la profession')
      console.error('Erreur lors de la création de la profession:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle profession</DialogTitle>
          <DialogDescription>
            Créez rapidement une nouvelle profession sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de la profession <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Ingénieur, Médecin..." 
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Santé, Technique, Éducation..." 
                      {...field}
                      value={field.value || ''}
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

