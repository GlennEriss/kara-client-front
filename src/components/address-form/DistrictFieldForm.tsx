'use client'

import { RegisterFormData } from '@/schemas/schemas'
import { useFormContext } from 'react-hook-form'
import DistrictSearchForm from './DistrictSearchForm'

export default function DistrictFieldForm() {
  const form = useFormContext<RegisterFormData>()
  return <DistrictSearchForm form={form} />
}
