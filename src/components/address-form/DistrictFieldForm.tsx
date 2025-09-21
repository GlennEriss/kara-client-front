'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import DistrictSearchForm from './DistrictSearchForm'
import { RegisterFormData } from '@/schemas/schemas'

export default function DistrictFieldForm() {
  const form = useFormContext<RegisterFormData>()
  return <DistrictSearchForm form={form} />
}
