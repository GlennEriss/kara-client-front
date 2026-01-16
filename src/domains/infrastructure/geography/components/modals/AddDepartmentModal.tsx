'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { useDepartmentMutations, useProvinces } from '../../hooks/useGeographie'
import { departmentSchema, type DepartmentFormData } from '../../schemas/geographie.schema'
import type { Department } from '../../entities/geography.types'

interface AddDepartmentModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newDepartment: Department) => void
  provinceId?: string // Province pré-sélectionnée si disponible
}

export default function AddDepartmentModal({ open, onClose, onSuccess, provinceId }: AddDepartmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const departmentMutations = useDepartmentMutations()
  const { data: provinces = [], isLoading: isLoadingProvinces } = useProvinces()
  
  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      provinceId: provinceId || '',
      name: '',
      code: '',
    }
  })

  // Trier les provinces par ordre alphabétique
  const sortedProvinces = useMemo(() => {
    return [...provinces].sort((a, b) => 
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    )
  }, [provinces])

  // Mettre à jour provinceId si fourni en prop
  useEffect(() => {
    if (provinceId && !form.getValues('provinceId')) {
      form.setValue('provinceId', provinceId)
    }
  }, [provinceId, form])

  const selectedProvinceId = form.watch('provinceId')

  const handleSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true)
    try {
      const newDepartment = await departmentMutations.create.mutateAsync(data)
      onSuccess(newDepartment)
      form.reset()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la création du département:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau département</DialogTitle>
          <DialogDescription>
            Créez rapidement un nouveau département sans quitter le formulaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="provinceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province <span className="text-red-500">*</span></FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    disabled={!!provinceId || isLoadingProvinces}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          provinceId 
                            ? "Province pré-sélectionnée" 
                            : isLoadingProvinces
                            ? "Chargement..."
                            : "Sélectionnez une province"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingProvinces ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="w-4 h-4 animate-spin text-[#224D62]" />
                        </div>
                      ) : (
                        sortedProvinces.map((province) => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))
                      )}
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
                  <FormLabel>Nom du département <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Libreville" 
                      {...field} 
                      autoFocus={!!provinceId}
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
                  <FormLabel>Code du département</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: LBV" 
                      {...field}
                      value={field.value || ''}
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
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedProvinceId}
                className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
              >
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

