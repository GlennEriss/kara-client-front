import React from 'react'
import ListDocuments from '@/components/member/ListDocuments'

interface MemberDocumentsPageProps {
  params: Promise<{ id: string }>
}

export default async function MemberDocumentsPage({ params }: MemberDocumentsPageProps) {
  const { id } = await params
  return <ListDocuments memberId={id} />
}
