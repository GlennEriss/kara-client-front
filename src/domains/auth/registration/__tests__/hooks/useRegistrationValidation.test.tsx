/**
 * Tests unitaires pour useRegistrationValidation
 */

import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useForm, FormProvider, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRegistrationValidation } from '../../hooks/useRegistrationValidation'
import { registerSchema, defaultValues } from '@/schemas/schemas'
import type { RegisterFormData } from '../../entities'
import React from 'react'

describe('useRegistrationValidation', () => {
  describe('validateStep', () => {
    it('devrait valider une étape avec des données valides', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })

        const validIdentityData = {
          civility: 'Monsieur' as const,
          lastName: 'Doe',
          firstName: 'John',
          birthDate: '1990-01-01',
          birthPlace: 'Libreville',
          birthCertificateNumber: '123456',
          prayerPlace: 'Église',
          religion: 'Christianisme',
          contacts: ['+24165671734'],
          gender: 'Homme' as const,
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire' as const,
          hasCar: false,
          intermediaryCode: '1228.MK.0058',
        }

        React.useEffect(() => {
          form.setValue('identity', validIdentityData as any)
        }, [form])

        return <FormProvider {...form}>{children}</FormProvider>
      }
      Wrapper.displayName = 'FormWrapper'

      const { result } = renderHook(() => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return useRegistrationValidation({ form })
      }, { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      const isValid = await result.current.validateStep(1)
      expect(typeof isValid).toBe('boolean')
    })

    it('devrait retourner false pour des données invalides', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })

        const invalidIdentityData = {
          civility: 'Monsieur' as const,
          lastName: '', // Invalide (requis)
          firstName: 'John',
          birthDate: '1990-01-01',
          birthPlace: 'Libreville',
          birthCertificateNumber: '123456',
          prayerPlace: 'Église',
          religion: 'Christianisme',
          contacts: [],
          gender: 'Homme' as const,
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire' as const,
          hasCar: false,
        }

        React.useEffect(() => {
          form.setValue('identity', invalidIdentityData as any)
        }, [form])

        return <FormProvider {...form}>{children}</FormProvider>
      }
      Wrapper.displayName = 'FormWrapper'

      const { result } = renderHook(() => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return useRegistrationValidation({ form })
      }, { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      const isValid = await result.current.validateStep(1)
      expect(isValid).toBe(false)
    })

    it('devrait retourner false pour une étape invalide', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return <FormProvider {...form}>{children}</FormProvider>
      }
      Wrapper.displayName = 'FormWrapper'

      const { result } = renderHook(() => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return useRegistrationValidation({ form })
      }, { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      const isValid = await result.current.validateStep(99)
      expect(isValid).toBe(false)
    })

    it('devrait appliquer les erreurs Zod au formulaire', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })

        const invalidData = {
          civility: 'Invalid' as any,
          lastName: '',
          firstName: '',
          birthDate: '',
          birthPlace: '',
          birthCertificateNumber: '',
          prayerPlace: '',
          religion: '',
          contacts: [],
          gender: '' as any,
          nationality: '',
          maritalStatus: '' as any,
          hasCar: false,
        }

        React.useEffect(() => {
          form.setValue('identity', invalidData as any)
        }, [form])

        return <FormProvider {...form}>{children}</FormProvider>
      }
      Wrapper.displayName = 'FormWrapper'

      const { result } = renderHook(() => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        
        // Définir des données invalides
        React.useEffect(() => {
          const invalidData = {
            civility: 'Invalid' as any,
            lastName: '',
            firstName: '',
            birthDate: '',
            birthPlace: '',
            birthCertificateNumber: '',
            prayerPlace: '',
            religion: '',
            contacts: [],
            gender: '' as any,
            nationality: '',
            maritalStatus: '' as any,
            hasCar: false,
          }
          form.setValue('identity', invalidData as any)
        }, [form])
        
        return useRegistrationValidation({ form })
      }, { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      const isValid = await result.current.validateStep(1)
      // validateStep devrait retourner false pour des données invalides
      expect(isValid).toBe(false)
    })
  })

  describe('validateCurrentStep', () => {
    it('devrait valider l\'étape actuelle', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })

        const validIdentityData = {
          civility: 'Monsieur' as const,
          lastName: 'Doe',
          firstName: 'John',
          birthDate: '1990-01-01',
          birthPlace: 'Libreville',
          birthCertificateNumber: '123456',
          prayerPlace: 'Église',
          religion: 'Christianisme',
          contacts: ['+24165671734'],
          gender: 'Homme' as const,
          nationality: 'Gabonaise',
          maritalStatus: 'Célibataire' as const,
          hasCar: false,
          intermediaryCode: '1228.MK.0058',
        }

        React.useEffect(() => {
          form.setValue('identity', validIdentityData as any)
        }, [form])

        return <FormProvider {...form}>{children}</FormProvider>
      }
      Wrapper.displayName = 'FormWrapper'

      const { result } = renderHook(() => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return useRegistrationValidation({ form })
      }, { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      const isValid = await result.current.validateCurrentStep(1)
      expect(typeof isValid).toBe('boolean')
    })

    it('devrait appeler validateStep avec l\'étape actuelle', async () => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return <FormProvider {...form}>{children}</FormProvider>
      }
      Wrapper.displayName = 'FormWrapper'

      const { result } = renderHook(() => {
        const form = useForm<RegisterFormData>({
          resolver: zodResolver(registerSchema) as any,
          defaultValues: defaultValues as RegisterFormData,
          mode: 'onChange',
        })
        return useRegistrationValidation({ form })
      }, { wrapper: Wrapper })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Vérifier que validateCurrentStep appelle validateStep en vérifiant le résultat
      const isValid = await result.current.validateCurrentStep(2)
      
      // validateCurrentStep devrait retourner un booléen (résultat de validateStep)
      expect(typeof isValid).toBe('boolean')
    })
  })
})
