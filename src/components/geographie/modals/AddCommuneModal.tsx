'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useCommuneMutations, useDepartments } from '@/hooks/useGeographie'
import { communeSchema, type CommuneFormData } from '@/schemas/geographie.schema'
import type { Commune } from '@/types/types'

interface AddCommuneModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newCommune: Commune) => void
  provinceId?: string // Province pré-sélectionnée si disponible
}

export default function AddCommuneModal({ open, onClose, onSuccess, provinceId }: AddCommuneModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const communeMutations = useCommuneMutations()
  
  const form = useForm<CommuneFormData>({
    resolver: zodResolver(communeSchema),
    defaultValues: {
      name: '',
      departmentId: '',
      postalCode: '',
      alias: '',
    }
  })

  const selectedDepartmentId = form.watch('departmentId')
  const { data: departments = [] } = useDepartments(provinceId)

  // Trier les départements par ordre alphabétique
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [departments])

  const handleSubmit = async (data: CommuneFormData) => {
    setIsSubmitting(true)
    try {
      const newCommune = await communeMutations.create.mutateAsync(data)
      onSuccess(newCommune)
      form.reset()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la création de la commune:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle commune</DialogTitle>
          <DialogDescription>
            Créez rapidement une nouvelle commune sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Département <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!provinceId || departments.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!provinceId ? "Sélectionnez d'abord une province" : "Sélectionnez un département"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedDepartments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
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
                  <FormLabel>Nom de la commune <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Libreville" 
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
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code postal</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: 24100" 
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: LBV" 
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
              <Button type="submit" disabled={isSubmitting || !selectedDepartmentId}>
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

