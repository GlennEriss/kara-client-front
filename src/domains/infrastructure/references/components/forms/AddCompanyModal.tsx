'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useCompanyMutations } from '../../hooks/useCompanies'
import { useProvinces, useDepartments, useCommunes } from '@/domains/infrastructure/geography/hooks/useGeographie'
import { useAuth } from '@/hooks/useAuth'

const companyFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  industry: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
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

  // Système géographique de l'app : Province → (Département masqué) → Ville (Commune).
  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const { data: provinces = [], isLoading: loadingProvinces } = useProvinces()
  const { data: departments = [] } = useDepartments(selectedProvinceId || undefined)
  const { data: allCommunes = [] } = useCommunes()

  // Villes (communes) de la province sélectionnée, via ses départements.
  const cities = useMemo(() => {
    if (!selectedProvinceId) return []
    const deptIds = new Set(departments.map((d) => d.id))
    return allCommunes
      .filter((c) => deptIds.has(c.departmentId))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [selectedProvinceId, departments, allCommunes])

  const sortedProvinces = useMemo(
    () => [...provinces].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [provinces],
  )

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      industry: '',
      province: '',
      city: '',
    }
  })

  const handleSubmit = async (data: CompanyFormData) => {
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    setIsSubmitting(true)
    try {
      const province = data.province?.trim() || undefined
      const city = data.city?.trim() || undefined

      await create.mutateAsync({
        name: data.name,
        adminId: user.uid,
        industry: data.industry?.trim() || undefined,
        address: province || city ? { province, city } : undefined,
      })

      toast.success('Entreprise créée avec succès')
      onSuccess(data.name)
      form.reset()
      setSelectedProvinceId('')
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

            {/* Province (système géographique de l'app) */}
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(name) => {
                      field.onChange(name)
                      const p = provinces.find((pr) => pr.name === name)
                      setSelectedProvinceId(p?.id || '')
                      // Réinitialiser la ville quand la province change
                      form.setValue('city', '')
                    }}
                    disabled={loadingProvinces}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProvinces ? 'Chargement…' : 'Choisir une province'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedProvinces.map((p) => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ville / Commune (filtrée par la province) */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={!selectedProvinceId || cities.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedProvinceId
                              ? 'Choisissez d\'abord une province'
                              : cities.length === 0
                                ? 'Aucune ville disponible'
                                : 'Choisir une ville'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cities.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

