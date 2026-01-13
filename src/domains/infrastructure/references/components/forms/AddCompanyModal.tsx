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
import { useCompanyMutations } from '../../hooks/useCompanies'
import { useAuth } from '@/hooks/useAuth'

const companyFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  industry: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companyFormSchema>

interface AddCompanyModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (companyName: string) => void
}

export default function AddCompanyModal({ open, onClose, onSuccess }: AddCompanyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { create } = useCompanyMutations()
  const { user } = useAuth()
  
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      industry: '',
    }
  })

  const handleSubmit = async (data: CompanyFormData) => {
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    setIsSubmitting(true)
    try {
      await create.mutateAsync({
        name: data.name,
        adminId: user.uid,
        industry: data.industry?.trim() || undefined,
      })
      
      toast.success('Entreprise créée avec succès')
      onSuccess(data.name)
      form.reset()
      onClose()
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la création de l\'entreprise')
      console.error('Erreur lors de la création de l\'entreprise:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle entreprise</DialogTitle>
          <DialogDescription>
            Créez rapidement une nouvelle entreprise sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'entreprise <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Total Gabon" 
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
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secteur d'activité</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Pétrole, Santé, Éducation..." 
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

