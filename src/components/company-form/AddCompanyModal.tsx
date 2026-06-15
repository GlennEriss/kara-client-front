'use client'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCompanyMutations } from '@/domains/infrastructure/references/hooks/useCompanies'
import { useAuth } from '@/hooks/useAuth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
      <ModalContent size="sm">
        <ModalHeader
          title="Ajouter une nouvelle entreprise"
          description="Créez rapidement une nouvelle entreprise sans quitter le formulaire"
        />
        <ModalBody>
        <Form {...form}>
          <form id="add-company-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
          </form>
        </Form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" form="add-company-form" disabled={isSubmitting}>
            {isSubmitting ? 'Création...' : 'Créer'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}

