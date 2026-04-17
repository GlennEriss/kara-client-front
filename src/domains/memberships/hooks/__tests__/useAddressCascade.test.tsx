import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RegisterFormData } from '@/schemas/schemas'
import { useAddressCascade } from '../useAddressCascade'

vi.mock('@/domains/infrastructure/geography/hooks/useGeographie', () => ({
  useProvinces: vi.fn(),
  useDepartments: vi.fn(),
  useDistricts: vi.fn(),
}))

import {
  useDepartments,
  useDistricts,
  useProvinces,
} from '@/domains/infrastructure/geography/hooks/useGeographie'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'AddressCascadeQueryWrapper'
  return Wrapper
}

function renderAddressCascadeHook(
  defaultValues: RegisterFormData['address'],
  options?: { autoUpdateTextFields?: boolean }
) {
  return renderHook(() => {
    const form = useForm<RegisterFormData>({
      defaultValues: { address: defaultValues },
    })
    return useAddressCascade({
      form,
      autoUpdateTextFields: options?.autoUpdateTextFields,
    })
  }, { wrapper: createWrapper() })
}

describe('useAddressCascade', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useProvinces).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useDepartments).mockReturnValue({ data: [], isLoading: false } as any)
    vi.mocked(useDistricts).mockReturnValue({ data: [], isLoading: false } as any)
  })

  it('retourne les IDs sélectionnés du formulaire', () => {
    const { result } = renderAddressCascadeHook({
      provinceId: '',
      communeId: '',
      districtId: '',
      quarterId: '',
      province: '',
      city: '',
      arrondissement: '',
      district: '',
    })

    expect(result.current.selectedIds).toEqual({
      provinceId: '',
      communeId: '',
      districtId: '',
      quarterId: '',
    })
  })

  it('retourne la province sélectionnée', () => {
    vi.mocked(useProvinces).mockReturnValue({
      data: [{ id: 'prov-1', name: 'Estuaire' }],
      isLoading: false,
    } as any)

    const { result } = renderAddressCascadeHook({
      provinceId: 'prov-1',
      communeId: '',
      districtId: '',
      quarterId: '',
      province: '',
      city: '',
      arrondissement: '',
      district: '',
    })

    expect(result.current.selectedEntities.province?.id).toBe('prov-1')
    expect(result.current.selectedEntities.province?.name).toBe('Estuaire')
  })

  it('retourne les états de chargement', () => {
    vi.mocked(useProvinces).mockReturnValue({ data: [], isLoading: true } as any)
    vi.mocked(useDistricts).mockReturnValue({ data: [], isLoading: true } as any)

    const { result } = renderAddressCascadeHook({
      provinceId: '',
      communeId: '',
      districtId: '',
      quarterId: '',
      province: '',
      city: '',
      arrondissement: '',
      district: '',
    })

    expect(result.current.isLoading.provinces).toBe(true)
    expect(result.current.isLoading.departments).toBe(false)
    expect(result.current.isLoading.districts).toBe(true)
    expect(result.current.isLoading.communes).toBe(false)
    expect(result.current.isLoading.quarters).toBe(false)
  })

  it('fonctionne avec autoUpdateTextFields=false', () => {
    const { result } = renderAddressCascadeHook({
      provinceId: '',
      communeId: '',
      districtId: '',
      quarterId: '',
      province: 'Ancienne valeur',
      city: '',
      arrondissement: '',
      district: '',
    }, { autoUpdateTextFields: false })

    expect(result.current.selectedIds.provinceId).toBe('')
  })
})

