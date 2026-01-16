'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useCommuneMutations, useDepartments } from '../../hooks/useGeographie'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { communeSchema, type CommuneFormData } from '../../schemas/geographie.schema'
import type { Commune, Department } from '../../entities/geography.types'
import AddDepartmentModal from './AddDepartmentModal'

interface AddCommuneModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newCommune: Commune) => void
  provinceId?: string // Province pré-sélectionnée si disponible
}

export default function AddCommuneModal({ open, onClose, onSuccess, provinceId }: AddCommuneModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false)
  const communeMutations = useCommuneMutations()
  const queryClient = useQueryClient()
  
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
  // Charger TOUS les départements, pas seulement ceux de la province (comme dans CommuneList.tsx)
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartments(undefined)

  // Trier les départements par ordre alphabétique
  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [departments])

  // Handler pour la création de département en cascade
  const handleDepartmentCreated = (newDepartment: Department) => {
    // Invalider le cache des départements
    queryClient.invalidateQueries({ queryKey: ['departments'] })
    
    // Pré-sélectionner le département dans le formulaire de commune
    form.setValue('departmentId', newDepartment.id, { shouldValidate: true })
    
    // Fermer le modal de département
    setShowAddDepartmentModal(false)
    
    // Toast de confirmation
    toast.success(`Département "${newDepartment.name}" créé et sélectionné`)
  }

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
                  <div className="flex items-center gap-2">
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={isLoadingDepartments}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            isLoadingDepartments
                              ? "Chargement..."
                              : sortedDepartments.length === 0
                              ? "Aucun département disponible"
                              : "Sélectionnez un département"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingDepartments ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                          </div>
                        ) : sortedDepartments.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Aucun département disponible
                          </div>
                        ) : (
                          sortedDepartments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {/* Toujours permettre la création de département, même sans province pré-sélectionnée */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddDepartmentModal(true)}
                      className="h-10 w-10 flex-shrink-0"
                      title="Créer un nouveau département"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
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
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedDepartmentId}
                className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
              >
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Modal de création de département en cascade */}
      <AddDepartmentModal
        open={showAddDepartmentModal}
        onClose={() => setShowAddDepartmentModal(false)}
        onSuccess={handleDepartmentCreated}
        provinceId={provinceId}
      />
    </Dialog>
  )
}

