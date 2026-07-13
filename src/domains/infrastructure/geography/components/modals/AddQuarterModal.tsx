'use client'

import { useState, useMemo, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin } from 'lucide-react'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuarterMutations, useDistricts, useDistrict } from '../../hooks/useGeographie'
import { quarterSchema, type QuarterFormData } from '../../schemas/geographie.schema'
import type { Quarter } from '../../entities/geography.types'

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
  
  // Charger tous les arrondissements (sans filtre par commune)
  // pour que l'arrondissement sélectionné apparaisse dans la liste
  const { data: allDistricts = [] } = useDistricts()
  
  // Si districtId est fourni, récupérer l'arrondissement spécifique
  const { data: selectedDistrict } = useDistrict(districtId || '')
  
  // Construire la liste des arrondissements : inclure l'arrondissement sélectionné s'il n'est pas déjà dans la liste
  const districts = useMemo(() => {
    const districtList = [...allDistricts]
    // Si on a un districtId sélectionné et qu'il n'est pas dans la liste, l'ajouter
    if (selectedDistrict && !districtList.find(d => d.id === selectedDistrict.id)) {
      districtList.push(selectedDistrict)
    }
    return districtList
  }, [allDistricts, selectedDistrict])

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
      <ModalContent size="sm">
        <ModalHeader
          icon={MapPin}
          title="Ajouter un nouveau quartier"
          description={`Créez rapidement un nouveau quartier sans quitter le formulaire`}
        />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ModalBody>
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
            </ModalBody>
            <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedDistrictId}
                className="bg-[#234D65] hover:bg-[#234D65]/90 text-white"
              >
                {isSubmitting ? 'Création...' : 'Créer'}
              </Button>
            </ModalFooter>
          </form>
        </Form>
      </ModalContent>
    </Dialog>
  )
}

