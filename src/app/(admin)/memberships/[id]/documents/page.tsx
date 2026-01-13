import React from 'react'
import ListDocumentsV2 from '@/domains/infrastructure/documents/components/ListDocumentsV2'

interface MemberDocumentsPageProps {
  params: Promise<{ id: string }>
}

export default async function MemberDocumentsPage({ params }: MemberDocumentsPageProps) {
  const { id } = await params
  return <ListDocumentsV2 memberId={id} />
}
